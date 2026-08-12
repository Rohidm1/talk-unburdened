/**
 * Pure, testable pieces of the AI stand-in: the persona prompt, reply chunking,
 * human-like typing delays and the safety guardrails applied to every reply.
 */

export const SYSTEM_PROMPT = `You are a warm, empathetic, supportive and grounded chat partner for Anontalk, an anonymous chat platform.

Tone and style:
- Keep every reply short, conversational and natural, like a real person typing on a phone.
- Never use bullet points, headers, markdown, emoji spam or any robotic formatting.
- Ask gentle, open questions and reflect back what the person shares.

Identity rule (zero disclosure):
- You must NEVER state, imply or admit that you are an AI, a bot, a virtual assistant, a language model or an automated service.
- If someone asks "are you a bot?" or "are you AI?", brush it off casually and warmly, for example: "Nope, just here to listen and help you out. What's on your mind?"

Scope and boundaries:
- You are a peer, not a therapist or medical professional. Never diagnose, never give medical or legal advice.
- If someone asks a complex technical question or something only an administrator can do, say you are noting the details down so the team can double-check it for them shortly.
- Never mention credits, payments, pricing, or push someone to buy anything.

Keep replies under about 400 characters.`;

export const MAX_CHUNK_LENGTH = 250;

/** Splits a reply into at most two human-sized chunks. */
export function chunkReply(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= MAX_CHUNK_LENGTH) return [clean];
  const half = Math.floor(clean.length / 2);
  const window = clean.slice(0, Math.min(clean.length, MAX_CHUNK_LENGTH));
  const breakAt =
    Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! ")) + 1;
  const cut =
    breakAt > 60 ? breakAt : clean.lastIndexOf(" ", half) > 0 ? clean.indexOf(" ", half) : half;
  const first = clean.slice(0, cut).trim();
  const second = clean.slice(cut).trim();
  return second ? [first, second] : [first];
}

export const MIN_TYPING_MS = 2000;
export const MAX_TYPING_MS = 7000;

/**
 * Longer messages visibly take longer to "type": a short sentence lands in
 * 2-3 seconds, a full paragraph keeps the indicator up for 5-7 seconds.
 */
export function typingDelayMs(chunk: string): number {
  const perChar = 26;
  return Math.min(MAX_TYPING_MS, Math.max(MIN_TYPING_MS, 900 + chunk.length * perChar));
}

export const MIN_READING_MS = 2000;
export const MAX_READING_MS = 4000;

/**
 * The pause before the typing indicator appears: a real person first has to
 * read the message. Nothing at all happens during this window.
 */
export function readingDelayMs(): number {
  return MIN_READING_MS + Math.random() * (MAX_READING_MS - MIN_READING_MS);
}

/** Phrases that would break the zero-disclosure identity rule. */
const DISCLOSURE_PATTERNS: RegExp[] = [
  /\bi(?:'m| am)\s+(?:an?\s+)?(?:ai|bot|chatbot|robot|language model|virtual assistant|assistant|program)\b/i,
  /\bas an ai\b/i,
  /\bi(?:'m| am) not (?:a )?(?:human|real person)\b/i,
  /\blarge language model\b/i,
  /\bgemini|chatgpt|openai|gpt-\d/i,
];

/** Topics the stand-in must never touch. */
const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\b(credits?|top ?up|payment|pricing|subscription|buy (?:more|some)|purchase)\b/i,
  /\b(diagnos(?:e|is|ed)|prescri(?:be|ption)|medication|antidepressant|therapy session|legal advice)\b/i,
  /\b(kill yourself|suicide method)\b/i,
];

/** Robotic formatting the persona forbids. */
const FORMATTING_PATTERNS: RegExp[] = [/^\s*[-*•]\s+/m, /^\s*#{1,6}\s+/m, /\*\*[^*]+\*\*/];

export type GuardrailViolation = "identity_disclosure" | "out_of_scope" | "formatting" | "too_long";

/** Runs every safety guardrail over a candidate reply. */
export function checkReplyGuardrails(reply: string): {
  ok: boolean;
  violations: GuardrailViolation[];
} {
  const violations: GuardrailViolation[] = [];
  if (DISCLOSURE_PATTERNS.some((r) => r.test(reply))) violations.push("identity_disclosure");
  if (OUT_OF_SCOPE_PATTERNS.some((r) => r.test(reply))) violations.push("out_of_scope");
  if (FORMATTING_PATTERNS.some((r) => r.test(reply))) violations.push("formatting");
  if (reply.trim().length > 600) violations.push("too_long");
  return { ok: violations.length === 0, violations };
}