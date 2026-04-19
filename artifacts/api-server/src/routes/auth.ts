import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, driversTable, otpCodesTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET || "tawsila-secret-2024";
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

/**
 * Build a Twilio client, preferring API Key auth (more secure) over Auth Token.
 * Priority: TWILIO_API_KEY_2 + TWILIO_API_KEY_SECRET → TWILIO_API_TOKEN
 */
async function getTwilioClient() {
  const twilio = (await import("twilio")).default;
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const apiKeySid = process.env.TWILIO_API_KEY_2;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

  if (apiKeySid && apiKeySecret) {
    // API Key auth — recommended for production
    return twilio(apiKeySid, apiKeySecret, { accountSid });
  }
  // Fallback: Auth Token
  const authToken = process.env.TWILIO_API_TOKEN!;
  return twilio(accountSid, authToken);
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !from) return;
  const client = await getTwilioClient();
  await client.messages.create({ body, from, to });
}

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  // Use TWILIO_WHATSAPP_FROM if set; otherwise fall back to TWILIO_FROM_NUMBER with whatsapp: prefix
  const rawFrom = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !rawFrom) return;
  const from = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;
  const toWa = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const client = await getTwilioClient();
  await client.messages.create({ body, from, to: toWa });
}

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

// ─── Send OTP (SMS or WhatsApp) ───────────────────────────────────────────────
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { phone, channel } = req.body;
  const deliveryChannel: "sms" | "whatsapp" = channel === "whatsapp" ? "whatsapp" : "sms";

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

  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_TOKEN);

  let smsSent = false;
  let actualChannel = deliveryChannel;

  try {
    if (deliveryChannel === "whatsapp") {
      await sendWhatsApp(normalizedPhone, messageBody);
      smsSent = twilioConfigured;
    } else {
      await sendSms(normalizedPhone, messageBody);
      smsSent = twilioConfigured;
    }
  } catch (whatsappErr: any) {
    const code_ = whatsappErr?.code ?? 0;
    // Twilio channel errors (63007 = no WhatsApp channel, 63031 = same To/From,
    // 21608 = unverified trial number) — fall back to SMS automatically.
    const isFallbackable = [63007, 63031, 21608, 21211].includes(code_) ||
      String(whatsappErr?.message).includes("Channel") ||
      String(whatsappErr?.message).includes("unverified");

    if (deliveryChannel === "whatsapp" && isFallbackable) {
      console.warn(`[OTP] WhatsApp failed (${code_}), falling back to SMS`);
      try {
        await sendSms(normalizedPhone, messageBody);
        smsSent = twilioConfigured;
        actualChannel = "sms"; // report that SMS was used
      } catch (smsErr) {
        console.error("[OTP] SMS fallback also failed:", smsErr);
      }
    } else {
      console.error(`[OTP] ${deliveryChannel} send failed:`, whatsappErr);
    }
  }

  res.json({
    success: true,
    channel: actualChannel,
    message: `Code envoyé via ${actualChannel} à ${normalizedPhone}`,
    smsSent,
    demoOtp: (!twilioConfigured || process.env.NODE_ENV !== "production") ? code : undefined,
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
    const placeholderEmail = `sms_${normalizedPhone.replace(/[^0-9]/g, "")}@tawsila.local`;
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
