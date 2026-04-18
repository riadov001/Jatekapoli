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

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-]/g, "");
  if (p.startsWith("00212")) return "+" + p.slice(2);
  if (p.startsWith("+212")) return p;
  if (p.startsWith("0")) return "+212" + p.slice(1);
  if (/^[67]/.test(p)) return "+212" + p;
  return p;
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_API_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (accountSid && authToken && from) {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    await client.messages.create({ body, from, to });
  }
  // If Twilio not configured, we fall through — demoOtp is returned in response
}

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
    name,
    email,
    password: hashed,
    role,
    phone: phone ?? null,
    loyaltyPoints: 0,
    isActive: true,
  }).returning();

  if (role === "driver") {
    await db.insert(driversTable).values({
      userId: user.id,
      name: user.name,
      phone: user.phone ?? null,
      isAvailable: true,
      totalDeliveries: 0,
    });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

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

router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { phone } = req.body;

  if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
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
    res.status(429).json({ error: "Please wait before requesting a new OTP" });
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.insert(otpCodesTable).values({ phone: normalizedPhone, code, expiresAt });

  // Send real SMS via Twilio (or log for demo)
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_API_TOKEN && process.env.TWILIO_FROM_NUMBER);
  try {
    await sendSms(normalizedPhone, `Your Tawsila verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`);
  } catch (err) {
    console.error("[OTP] SMS send failed:", err);
  }

  res.json({
    success: true,
    message: `OTP sent to ${normalizedPhone}`,
    smsSent: twilioConfigured,
    // Always return demoOtp in dev, only return in prod if SMS failed
    demoOtp: (!twilioConfigured || process.env.NODE_ENV !== "production") ? code : undefined,
  });
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { phone, code, name, role } = req.body;

  if (!phone || !code) {
    res.status(400).json({ error: "Phone and OTP code required" });
    return;
  }

  const normalizedPhone = normalizePhone(phone.trim());
  const now = new Date();

  // Get the most recent valid OTP (desc order)
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
    res.status(400).json({ error: "OTP expired or not found. Please request a new one." });
    return;
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    res.status(400).json({ error: "Too many incorrect attempts. Please request a new OTP." });
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
        ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Please request a new OTP.",
    });
    return;
  }

  // Mark OTP as used
  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));

  // Find or create user by phone
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
      name: userName,
      email: placeholderEmail,
      password: dummyPassword,
      role: userRole,
      phone: normalizedPhone,
      loyaltyPoints: 0,
      isActive: true,
    }).returning();

    if (userRole === "driver") {
      await db.insert(driversTable).values({
        userId: newUser.id,
        name: newUser.name,
        phone: newUser.phone ?? null,
        isAvailable: true,
        totalDeliveries: 0,
      });
    }

    user = newUser;
  } else if (name?.trim() && name.trim() !== user.name) {
    // Update existing user name if provided
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

// Update user name after OTP verification (for new users completing profile)
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
    res.status(400).json({ error: "Name must be at least 2 characters" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ name: name.trim() })
    .where(eq(usersTable.id, payload.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { password: _pw, ...safeUser } = user;
  res.json({ user: safeUser });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
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

export default router;
