// Twilio Voice helpers. Hand-rolled JWT signing so nothing Node-only is needed.

function b64url(bytes: Uint8Array | string): string {
  const raw =
    typeof bytes === "string"
      ? bytes
      : Array.from(bytes)
          .map((b) => String.fromCharCode(b))
          .join("");
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

export function twilioConfig() {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const apiKeySid = process.env["TWILIO_API_KEY_SID"];
  const apiKeySecret = process.env["TWILIO_API_KEY_SECRET"];
  const twimlAppSid = process.env["TWILIO_TWIML_APP_SID"];
  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) return null;
  return { accountSid, apiKeySid, apiKeySecret, twimlAppSid };
}

export async function createAccessToken(identity: string, ttlSeconds = 3600) {
  const cfg = twilioConfig();
  if (!cfg) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${cfg.apiKeySid}-${now}`,
    iss: cfg.apiKeySid,
    sub: cfg.accountSid,
    nbf: now,
    exp: now + ttlSeconds,
    grants: {
      identity,
      voice: {
        incoming: { allow: true },
        outgoing: { application_sid: cfg.twimlAppSid },
      },
    },
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = await hmac(cfg.apiKeySecret, unsigned);
  return `${unsigned}.${b64url(sig)}`;
}

// Short-lived proof that this browser was authorised to dial a given identity.
export async function signDialAuth(from: string, to: string, expiresAt: number) {
  const cfg = twilioConfig();
  if (!cfg) return null;
  const sig = await hmac(cfg.apiKeySecret, `${from}|${to}|${expiresAt}`);
  return `${expiresAt}.${b64url(sig)}`;
}

export async function verifyDialAuth(from: string, to: string, auth: string) {
  const [expRaw] = auth.split(".");
  const expiresAt = Number(expRaw);
  if (!expRaw || !Number.isFinite(expiresAt)) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;
  const expected = await signDialAuth(from, to, expiresAt);
  if (!expected) return false;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(auth);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Conference name a call is bridged through, so an admin can silently listen in. */
export function conferenceNameFor(callId: string) {
  return `anontalk-${callId}`;
}

export type ConferenceRole = "customer" | "agent" | "monitor";

/** Short-lived proof that this browser may join a conference in a given role. */
export async function signConferenceAuth(
  identity: string,
  conference: string,
  role: ConferenceRole,
  expiresAt: number,
) {
  const cfg = twilioConfig();
  if (!cfg) return null;
  const sig = await hmac(cfg.apiKeySecret, `${identity}|${conference}|${role}|${expiresAt}`);
  return `${expiresAt}.${b64url(sig)}`;
}

export async function verifyConferenceAuth(
  identity: string,
  conference: string,
  role: ConferenceRole,
  auth: string,
) {
  const [expRaw] = auth.split(".");
  const expiresAt = Number(expRaw);
  if (!expRaw || !Number.isFinite(expiresAt)) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;
  const expected = await signConferenceAuth(identity, conference, role, expiresAt);
  if (!expected) return false;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(auth);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}