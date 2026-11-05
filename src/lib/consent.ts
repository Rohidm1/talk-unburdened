/** Cookie consent: optional statistics and ads only run after "accepted". */
export const CONSENT_KEY = "at.consent";
export type ConsentChoice = "accepted" | "essential";
export const CONSENT_HISTORY_KEY = "at.consent.history.v1";
export const CONSENT_NOTICE_VERSION = "2026-11-05.v1";
export const CONSENT_NOTICE = "We use essential storage to keep you signed in. With your OK we also use visit statistics and Google ads cookies.";

export type ConsentRecord = {
  id: string;
  decidedAt: string;
  choice: ConsentChoice;
  noticeVersion: string;
  notice: string;
  choices: readonly string[];
  purposes: readonly string[];
  recipients: readonly string[];
  region: "unknown";
};

export function getConsentHistory(): ConsentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const records: unknown = JSON.parse(window.localStorage.getItem(CONSENT_HISTORY_KEY) || "[]");
    return Array.isArray(records) ? records.filter((r): r is ConsentRecord =>
      r && typeof r.id === "string" && typeof r.decidedAt === "string" &&
      (r.choice === "accepted" || r.choice === "essential") && typeof r.noticeVersion === "string") : [];
  } catch { return []; }
}

export function getConsentRecord(): ConsentRecord | undefined {
  return getConsentHistory().at(-1);
}

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "essential" ? v : null;
}

export function setConsent(choice: ConsentChoice) {
  const record: ConsentRecord = {
    id: crypto.randomUUID(), decidedAt: new Date().toISOString(), choice,
    noticeVersion: CONSENT_NOTICE_VERSION, notice: CONSENT_NOTICE,
    choices: ["Accept all", "Essential only"],
    purposes: ["visit statistics", "advertising", "verified sign-up measurement", "ad optimization"],
    recipients: ["Open Ear Collective", "Google"], region: "unknown",
  };
  // Keep previous acceptance evidence when a visitor later withdraws.
  window.localStorage.setItem(CONSENT_HISTORY_KEY, JSON.stringify([...getConsentHistory(), record]));
  window.localStorage.setItem(CONSENT_KEY, choice);
  window.dispatchEvent(new CustomEvent("at:consent", { detail: choice }));
}
