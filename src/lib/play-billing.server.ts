/**
 * Server-side Google Play purchase verification (Android Publisher API).
 * Needs secret GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (a service account with
 * "View financial data" + "Manage orders" access in Play Console).
 */
const PACKAGE_NAME = "online.anontalk.app";

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(): Promise<string> {
  const raw = process.env["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"];
  if (!raw) throw new Error("play_not_configured");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error("play_auth_failed");
  return ((await res.json()) as { access_token: string }).access_token;
}

export type PlayPurchase = { purchaseState: number; consumptionState: number; orderId?: string };

export async function verifyPlayPurchase(productId: string, token: string): Promise<PlayPurchase> {
  const at = await accessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${at}` } });
  if (!res.ok) throw new Error("play_invalid_purchase");
  return (await res.json()) as PlayPurchase;
}

export async function consumePlayPurchase(productId: string, token: string): Promise<void> {
  const at = await accessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:consume`;
  await fetch(url, { method: "POST", headers: { authorization: `Bearer ${at}` } });
}
