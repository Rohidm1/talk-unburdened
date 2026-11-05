import { getConsent } from "@/lib/consent";

/** Google Ads account tag and the "Verified sign-up" conversion. */
export const GOOGLE_ADS_ID = "AW-18556889359";
export const SIGNUP_SEND_TO = "AW-18556889359/sPZlCPmrq7IdEI_SzpBF";

/** A verification only counts as a new sign-up if it happened in this window. */
export const SIGNUP_WINDOW_MS = 48 * 60 * 60 * 1000;
const REPORTED_PREFIX = "at.ads.signup.";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function adsAllowed(): boolean {
  return getConsent() === "accepted";
}

/** Loads the Google tag once, only after the visitor accepted ad cookies. */
export function loadGoogleAds(): boolean {
  if (typeof window === "undefined" || !adsAllowed()) return false;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  if (document.querySelector("script[data-google-ads]")) return true;
  window.gtag("consent", "default", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  window.gtag("set", "developer_id.dZjgwMW", true);
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  s.async = true;
  s.setAttribute("data-google-ads", "");
  document.head.appendChild(s);
  return true;
}

type SignupUser = { id: string; email_confirmed_at?: string | null; is_anonymous?: boolean } | null | undefined;

/** True when this user verified their email recently and it hasn't been handled in this browser. */
export function isFreshVerifiedSignup(user: SignupUser, now: number, alreadyHandled: boolean): boolean {
  if (!user || user.is_anonymous || !user.email_confirmed_at || alreadyHandled) return false;
  const confirmed = Date.parse(user.email_confirmed_at);
  if (Number.isNaN(confirmed)) return false;
  const age = now - confirmed;
  return age >= 0 && age <= SIGNUP_WINDOW_MS;
}

/**
 * Reports a verified sign-up once. Without ad consent at that moment the
 * event is dropped (never replayed later). The user id dedupes in Google.
 */
export function reportVerifiedSignup(user: SignupUser): void {
  if (typeof window === "undefined" || !user) return;
  const key = REPORTED_PREFIX + user.id;
  const handled = window.localStorage.getItem(key) !== null;
  if (!isFreshVerifiedSignup(user, Date.now(), handled)) return;
  window.localStorage.setItem(key, "1");
  if (!loadGoogleAds()) return;
  window.gtag?.("event", "conversion", { send_to: SIGNUP_SEND_TO, transaction_id: user.id });
}
