// OTP messaging with multi-provider fallback chain.
//
// Order (SMS first — WhatsApp Business templates often "succeed" with HTTP
// 200 but never deliver if the template isn't approved, which silently breaks
// signups. SMS is the universal expectation for OTP and is far more reliable):
//   1. Infobip SMS
//   2. Twilio SMS        (via Replit Twilio integration)
//   3. Infobip WhatsApp  (fallback)
//   4. Twilio WhatsApp   (fallback, via Replit Twilio integration)
//
// Each provider is skipped silently when it isn't configured (no creds / no
// connector). The first successful send wins; failures are logged and the
// chain continues. If every configured provider fails, throws an aggregated
// error containing every attempt summary.
//
// The Twilio client comes from the Replit "twilio" connector — see
// getTwilioClient() below. Never cache the client — tokens expire.

import twilio from "twilio";

export type OtpChannel =
  | "infobip-whatsapp"
  | "infobip-sms"
  | "twilio-whatsapp"
  | "twilio-sms";

export interface SendOtpResult {
  channel: OtpChannel;
  attempts: AttemptLog[];
}

export interface AttemptLog {
  channel: OtpChannel | "skipped";
  ok: boolean;
  reason?: string;
}

// ─── Infobip ──────────────────────────────────────────────────────────────────
// Accept either INFOBIP_BASE_URL or INFOBIP_URL; strip an optional protocol
// and trailing slash so callers can paste the URL straight from the dashboard.
function infobipBaseHost(): string | undefined {
  const raw = process.env.INFOBIP_BASE_URL || process.env.INFOBIP_URL;
  if (!raw) return undefined;
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function infobipConfigured(): boolean {
  return !!(process.env.INFOBIP_API_KEY && infobipBaseHost());
}

async function sendInfobipSms(to: string, body: string): Promise<void> {
  const apiKey = process.env.INFOBIP_API_KEY!;
  const baseUrl = infobipBaseHost()!;
  const sender = process.env.INFOBIP_SENDER || "Jatek";
  const url = `https://${baseUrl}/sms/2/text/advanced`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messages: [{ from: sender, destinations: [{ to }], text: body }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Infobip SMS ${res.status}: ${err.slice(0, 200)}`);
  }
}

async function sendInfobipWhatsapp(to: string, body: string): Promise<void> {
  const apiKey = process.env.INFOBIP_API_KEY!;
  const baseUrl = infobipBaseHost()!;
  const from = process.env.INFOBIP_WA_SENDER;
  if (!from) throw new Error("INFOBIP_WA_SENDER not set");

  const url = `https://${baseUrl}/whatsapp/1/message/text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ from, to, content: { text: body } }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Infobip WhatsApp ${res.status}: ${err.slice(0, 200)}`);
  }
}

// ─── Twilio (via Replit connector) ────────────────────────────────────────────
// Replit "twilio" integration — credentials are fetched fresh on every call.
async function getTwilioCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Replit connector env not present");
  }

  const data = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=twilio`,
    {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    }
  ).then((r) => r.json());

  const conn = data.items?.[0];
  if (
    !conn ||
    !conn.settings?.account_sid ||
    !conn.settings?.api_key
  ) {
    throw new Error("Twilio not connected");
  }

  const accountSid = conn.settings.account_sid as string;
  const authToken = conn.settings.api_key as string;
  const phoneNumber = conn.settings.phone_number as string | undefined;
  // Optional Messaging Service SID (MG...) — when the integration was set up
  // with a Messaging Service rather than a single number, the user typically
  // pastes it into account_sid by mistake. We accept it via env override and
  // also detect the misplacement to surface a clear error below.
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID ||
    (typeof conn.settings.api_key_secret === "string" &&
    conn.settings.api_key_secret.startsWith("MG")
      ? (conn.settings.api_key_secret as string)
      : undefined);

  if (!accountSid.startsWith("AC")) {
    throw new Error(
      `Twilio account_sid is invalid — expected a value starting with "AC..." ` +
        `(your Twilio Account SID, found on the Twilio Console homepage). ` +
        `Got a value starting with "${accountSid.slice(0, 2)}..." instead. ` +
        `Open the integrations panel and reconnect Twilio with the correct Account SID.`,
    );
  }

  return { accountSid, authToken, phoneNumber, messagingServiceSid };
}

async function getTwilioClient() {
  const { accountSid, authToken } = await getTwilioCredentials();
  return twilio(accountSid, authToken);
}

async function twilioConfigured(): Promise<boolean> {
  try {
    await getTwilioCredentials();
    return true;
  } catch {
    return false;
  }
}

async function sendTwilioSms(to: string, body: string): Promise<void> {
  const client = await getTwilioClient();
  const { phoneNumber, messagingServiceSid } = await getTwilioCredentials();
  const from = process.env.TWILIO_SMS_FROM || phoneNumber;
  // Prefer Messaging Service when configured — works around country-specific
  // sender requirements (e.g. alphanumeric in Morocco) without code changes.
  if (messagingServiceSid) {
    await client.messages.create({ to, body, messagingServiceSid });
    return;
  }
  if (!from) throw new Error("Twilio SMS sender not configured");
  await client.messages.create({ to, from, body });
}

async function sendTwilioWhatsapp(to: string, body: string): Promise<void> {
  const client = await getTwilioClient();
  // Twilio sandbox default; user can override with TWILIO_WA_FROM (e.g. "whatsapp:+14155238886"
  // or a verified business number).
  const from = process.env.TWILIO_WA_FROM || "whatsapp:+14155238886";
  await client.messages.create({
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    body,
  });
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export async function sendOtpMessage(
  to: string,
  body: string
): Promise<SendOtpResult> {
  const attempts: AttemptLog[] = [];
  const infobipReady = infobipConfigured();
  const twilioReady = await twilioConfigured();

  type Step = { channel: OtpChannel; available: boolean; fn: () => Promise<void> };
  const steps: Step[] = [
    {
      channel: "infobip-sms",
      available: infobipReady,
      fn: () => sendInfobipSms(to, body),
    },
    {
      channel: "twilio-sms",
      available: twilioReady,
      fn: () => sendTwilioSms(to, body),
    },
    {
      channel: "infobip-whatsapp",
      available: infobipReady && !!process.env.INFOBIP_WA_SENDER,
      fn: () => sendInfobipWhatsapp(to, body),
    },
    {
      channel: "twilio-whatsapp",
      available: twilioReady,
      fn: () => sendTwilioWhatsapp(to, body),
    },
  ];

  for (const step of steps) {
    if (!step.available) {
      attempts.push({ channel: step.channel, ok: false, reason: "not configured" });
      continue;
    }
    try {
      await step.fn();
      attempts.push({ channel: step.channel, ok: true });
      console.info(`[OTP] sent via ${step.channel} to ${to}`);
      return { channel: step.channel, attempts };
    } catch (err: any) {
      const reason = err?.message ?? String(err);
      attempts.push({ channel: step.channel, ok: false, reason });
      console.warn(`[OTP] ${step.channel} failed for ${to}: ${reason}`);
    }
  }

  const summary = attempts
    .map((a) => `${a.channel}=${a.ok ? "ok" : a.reason}`)
    .join(" | ");
  throw new Error(`All OTP providers failed: ${summary}`);
}

export async function anyOtpProviderConfigured(): Promise<boolean> {
  // Used to decide whether to expose `demoOtp` and whether to surface a hard
  // 502 when delivery fails. Reflects ACTUAL readiness — for Twilio that means
  // verifying the connector is authorized for this Repl, not just that the
  // Replit connector env vars exist.
  if (infobipConfigured()) return true;
  return await twilioConfigured();
}
