/**
 * Free, on-device word filter (no AI). Runs before a message is sent:
 * - "toxic": harassment / slurs → gentle "rephrase?" warning
 * - "selfharm": signs someone may be in danger → helplines + Mood SOS
 * The database still blocks the worst words server-side.
 */
export type SafetyLevel = "ok" | "toxic" | "selfharm";

const SELF_HARM = [
  /\b(kill|hurt|harm|cut)\s*(my\s*self|myself)\b/i,
  /\b(want|wanna|going)\s+to\s+die\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend\s+(it\s+all|my\s+life)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\b(take|taking)\s+my\s+(own\s+)?life\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+alive|live)\b/i,
];

const TOXIC = [
  /\bf+u+c+k+\s*(you|u|off)\b/i,
  /\b(kill\s+yourself|kys)\b/i,
  /\bn[i1!]gg/i,
  /\bf[a@]gg?ot/i,
  /\bretard/i,
  /\b(whore|slut|cunt|bitch)\b/i,
  /\b(you'?re|ur|you\s+are)\s+(worthless|pathetic|disgusting|ugly|stupid|an?\s+idiot)\b/i,
  /\b(shut\s+up|go\s+die)\b/i,
];

export function checkMessage(text: string): SafetyLevel {
  const t = text.normalize("NFKC");
  if (SELF_HARM.some((r) => r.test(t))) return "selfharm";
  if (TOXIC.some((r) => r.test(t))) return "toxic";
  return "ok";
}

/**
 * Ask the global safety prompt (mounted in the root layout) whether to send.
 * Resolves true immediately for ordinary messages.
 */
export function confirmSafeToSend(text: string): Promise<boolean> {
  const level = checkMessage(text);
  if (level === "ok" || typeof window === "undefined") return Promise.resolve(true);
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent("at:safety", { detail: { level, resolve } }));
  });
}

export function openSos() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("at:sos"));
}
