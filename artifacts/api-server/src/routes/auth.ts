import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, driversTable, otpCodesTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { sendOtpMessage, anyOtpProviderConfigured } from "../lib/otpMessaging.js";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "jatek-secret-2024";
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RATE_LIMIT_MINUTES = 1;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize a phone number to E.164 format.
 * - If it already starts with +, trust it as-is (international format from frontend picker).
 * - Handle 00 prefix → +
 * - Legacy Moroccan shorthand (06/07 → +212…)
 */
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-\(\)\.]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return "+" + p.slice(2);
  if (p.startsWith("0")) return "+212" + p.slice(1); // legacy Moroccan
  if (/^[67]/.test(p)) return "+212" + p;            // legacy Moroccan bare digits
  return p;
}

// OTP messaging is delegated to lib/otpMessaging.ts which implements the
// Infobip-WhatsApp → Infobip-SMS → Twilio-WhatsApp → Twilio-SMS fallback chain.

// ─── Register (email/password, for admin/driver panel) ──────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, role, phone } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name, email, password: hashed, role,
    phone: phone ?? null, loyaltyPoints: 0, isActive: true,
  }).returning();

  if (role === "driver") {
    await db.insert(driversTable).values({
      userId: user.id, name: user.name, phone: user.phone ?? null,
      isAvailable: true, totalDeliveries: 0,
    });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

// ─── Login (email/password) ──────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ─── Send OTP (multi-provider fallback chain) ─────────────────────────────────
// Always walks Infobip-WhatsApp → Infobip-SMS → Twilio-WhatsApp → Twilio-SMS,
// stopping on the first success. The `channel` request field is accepted for
// backwards compat but no longer changes the order — that's by design.
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { phone } = req.body;

  if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
    res.status(400).json({ error: "Valid phone number required" });
    return;
  }

  const normalizedPhone = normalizePhone(phone.trim());

  // Rate limit: max 1 OTP per minute per phone
  const recentOtp = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, normalizedPhone),
        gt(otpCodesTable.createdAt, new Date(Date.now() - OTP_RATE_LIMIT_MINUTES * 60 * 1000))
      )
    )
    .limit(1);

  if (recentOtp.length > 0) {
    res.status(429).json({ error: "Veuillez attendre avant de demander un nouveau code" });
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(otpCodesTable).values({ phone: normalizedPhone, code, expiresAt });

  const messageBody = `Votre code Jatek : ${code}\nValable ${OTP_EXPIRY_MINUTES} minutes. Ne le communiquez à personne.`;

  const providerReady = await anyOtpProviderConfigured();
  const isDev = process.env.NODE_ENV !== "production";
  // Replit sets REPLIT_DEPLOYMENT for published deployments. We treat the
  // absence of that flag (and other deploy markers) as "local workspace".
  // Only expose the OTP in plaintext when ALL of the following hold:
  //   - NODE_ENV !== production
  //   - no real OTP provider is configured
  //   - we are running in a local workspace (not a published deployment)
  // Otherwise — including preview/staging — we always require a real provider
  // and return 502 if delivery fails. Never leak the code over the network.
  const isLocalWorkspace = !process.env.REPLIT_DEPLOYMENT
    && !process.env.REPLIT_DEPLOYMENT_ID
    && !process.env.REPLIT_DEPLOYMENT_DOMAIN;
  const canExposeDemoOtp = isDev && !providerReady && isLocalWorkspace;

  let actualChannel: string = "none";
  let smsSent = false;
  let deliveryFailed = false;

  try {
    const result = await sendOtpMessage(normalizedPhone, messageBody);
    actualChannel = result.channel;
    smsSent = true;
  } catch (err: any) {
    deliveryFailed = true;
    console.error(`[OTP] all providers failed for ${normalizedPhone}:`, err?.message ?? err);
    if (!canExposeDemoOtp) {
      // No safe way to deliver the code — return a hard error.
      res.status(502).json({ error: "Impossible d'envoyer le code. Réessayez dans un instant." });
      return;
    }
    // Local dev with no providers configured — fall through and expose demoOtp.
  }

  res.json({
    success: true,
    channel: actualChannel,
    message: deliveryFailed
      ? `Code de démo (aucun provider configuré) pour ${normalizedPhone}`
      : `Code envoyé via ${actualChannel} à ${normalizedPhone}`,
    smsSent,
    demoOtp: canExposeDemoOtp ? code : undefined,
  });
});

// ─── Verify OTP ───────────────────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { phone, code, name, role } = req.body;

  if (!phone || !code) {
    res.status(400).json({ error: "Numéro de téléphone et code requis" });
    return;
  }

  const normalizedPhone = normalizePhone(phone.trim());
  const now = new Date();

  const [otpRecord] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, normalizedPhone),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, now)
      )
    )
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (!otpRecord) {
    res.status(400).json({ error: "Code expiré ou introuvable. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    res.status(400).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.code !== code.trim()) {
    await db
      .update(otpCodesTable)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpCodesTable.id, otpRecord.id));

    const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
    res.status(400).json({
      error: remaining > 0
        ? `Code incorrect. ${remaining} tentative${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}.`
        : "Trop de tentatives. Demandez un nouveau code.",
    });
    return;
  }

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, normalizedPhone))
    .limit(1);

  let user = existingUser;
  const isNewUser = !user;

  if (!user) {
    const userName = name?.trim() || `User ${normalizedPhone.slice(-4)}`;
    const userRole = role || "customer";
    const placeholderEmail = `sms_${normalizedPhone.replace(/[^0-9]/g, "")}@jatek.local`;
    const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);

    const [newUser] = await db.insert(usersTable).values({
      name: userName, email: placeholderEmail, password: dummyPassword,
      role: userRole, phone: normalizedPhone, loyaltyPoints: 0, isActive: true,
    }).returning();

    if (userRole === "driver") {
      await db.insert(driversTable).values({
        userId: newUser.id, name: newUser.name, phone: newUser.phone ?? null,
        isAvailable: true, totalDeliveries: 0,
      });
    }
    user = newUser;
  } else if (name?.trim() && name.trim() !== user.name) {
    const [updated] = await db
      .update(usersTable)
      .set({ name: name.trim() })
      .where(eq(usersTable.id, user.id))
      .returning();
    user = updated;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser, isNewUser });
});

// ─── Update name after OTP for new users ─────────────────────────────────────
router.patch("/auth/update-name", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  let payload: { userId: number };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ error: "Le prénom doit comporter au moins 2 caractères" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ name: name.trim() })
    .where(eq(usersTable.id, payload.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }

  const { password: _pw, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ─── Get current user ─────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }
    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── Forgot password — send OTP to user's phone ──────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email requis" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  const isDev = process.env.NODE_ENV !== "production";
  const isLocalWorkspace = !process.env.REPLIT_DEPLOYMENT
    && !process.env.REPLIT_DEPLOYMENT_ID
    && !process.env.REPLIT_DEPLOYMENT_DOMAIN;
  const providerReady = await anyOtpProviderConfigured();
  const canExposeDemoOtp = isDev && !providerReady && isLocalWorkspace;

  // Constant-shape response — never reveal whether the email exists or has a
  // phone on file. Always return the same body regardless of outcome.
  const genericResponse: Record<string, unknown> = {
    success: true,
    message: "Si un compte est associé à cet email et possède un numéro de téléphone, un code a été envoyé.",
  };

  // Silently no-op when user is unknown or has no phone — same response shape.
  if (!user || !user.phone) {
    res.json(genericResponse);
    return;
  }

  const normalizedPhone = normalizePhone(user.phone);

  // Rate limit (silent — same response shape, no 429 leak)
  const recentOtp = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, normalizedPhone),
        gt(otpCodesTable.createdAt, new Date(Date.now() - OTP_RATE_LIMIT_MINUTES * 60 * 1000))
      )
    )
    .limit(1);

  if (recentOtp.length > 0) {
    res.json(genericResponse);
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(otpCodesTable).values({ phone: normalizedPhone, code, expiresAt });

  const messageBody = `Code de réinitialisation Jatek : ${code}\nValable ${OTP_EXPIRY_MINUTES} minutes.`;

  try {
    await sendOtpMessage(normalizedPhone, messageBody);
  } catch (err: any) {
    console.error(`[forgot-password] all providers failed for ${normalizedPhone}:`, err?.message ?? err);
    // Stay silent on delivery failures too — no info leak.
  }

  // Demo OTP only ever exposed in local-workspace dev with no provider configured.
  if (canExposeDemoOtp) {
    genericResponse.demoOtp = code;
  }

  res.json(genericResponse);
});

// ─── Reset password using OTP ────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, code, newPassword } = req.body ?? {};
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: "Email, code et nouveau mot de passe requis" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit comporter au moins 6 caractères" });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (!user || !user.phone) {
    res.status(400).json({ error: "Code invalide ou expiré" });
    return;
  }

  const normalizedPhone = normalizePhone(user.phone);
  const now = new Date();

  const [otpRecord] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, normalizedPhone),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, now)
      )
    )
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (!otpRecord) {
    res.status(400).json({ error: "Code expiré ou introuvable. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    res.status(400).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.code !== String(code).trim()) {
    await db
      .update(otpCodesTable)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpCodesTable.id, otpRecord.id));
    const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
    res.status(400).json({
      error: remaining > 0
        ? `Code incorrect. ${remaining} tentative${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}.`
        : "Trop de tentatives. Demandez un nouveau code.",
    });
    return;
  }

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.delete("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    await db.delete(usersTable).where(eq(usersTable.id, payload.userId));
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
