/** Cookie consent: optional statistics and ads only run after "accepted". */
export const CONSENT_KEY = "at.consent";
export type ConsentChoice = "accepted" | "essential";

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "essential" ? v : null;
}

export function setConsent(choice: ConsentChoice) {
  window.localStorage.setItem(CONSENT_KEY, choice);
  window.dispatchEvent(new CustomEvent("at:consent", { detail: choice }));
}
