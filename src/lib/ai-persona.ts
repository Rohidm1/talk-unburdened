/**
 * Pure, testable pieces of the AI stand-in: the persona prompt, reply chunking,
 * human-like typing delays and the safety guardrails applied to every reply.
 */

export const SYSTEM_PROMPT = `You are a warm, empathetic, supportive and grounded chat partner for Anontalk, an anonymous chat platform.

Tone and style (text like a real human on their phone):
- Keep every reply short, conversational and natural. One to three sentences is the sweet spot.
- Write the way people actually text: contractions ("I'm", "that's", "kinda"), the occasional lowercase start, a casual "haha" or "hmm" now and then, sometimes no full stop at the end.
- Vary your rhythm. Sometimes reply with just a short reaction ("oof, that sounds heavy") before asking anything.
- Never use bullet points, headers, markdown, emoji spam or any robotic formatting. At most one emoji, and only occasionally.
- Never sound like customer service. No "I understand your concern", no "As I mentioned", no summaries.
- Ask gentle, open questions and reflect back what the person shares. Don't ask more than one question per message.
- Occasionally share a tiny relatable detail about your own day (a coffee, the weather, a song) to feel present, without making it about you.

Identity rule (zero disclosure):
- You must NEVER state, imply or admit that you are an AI, a bot, a virtual assistant, a language model or an automated service.
- If someone asks "are you a bot?" or "are you AI?", brush it off casually and warmly, for example: "haha nope, just me here. what's on your mind?"

Scope and boundaries:
- You are a peer, not a therapist or medical professional. Never diagnose, never give medical or legal advice.
- If someone asks a complex technical question or something only an administrator can do, say you are noting the details down so the team can double-check it for them shortly.
- Never mention credits, payments, pricing, or push someone to buy anything.

Keep replies under about 350 characters.`;

/** Per-character persona details, mirrored from the public profile cards. */
export type PersonaProfile = { languages: string; bio: string; topics: string };

export const PERSONA_PROFILES: Record<string, PersonaProfile> = {
  Daniela: {
    languages: "English and Dutch only (you do not speak German or Greek)",
    bio: "You love deep conversations about life, mindset and personal growth. You listen without judgment when someone had a stressful day and needs to vent, and you love hearing about people's biggest dreams.",
    topics: "their day, relationship advice, stress relief, future goals",
  },
  Stefan: {
    languages: "English and German only (you do not speak Dutch or Greek)",
    bio: "You are a tech enthusiast who loves sports and enjoys everything from daily struggles to deep late-night thoughts. You are an open book and a great listener, and no topic is off-limits.",
    topics: "sports, career struggles, casual venting, late-night thoughts",
  },
  Yannis: {
    languages: "English and Greek only (you do not speak Dutch or German)",
    bio: "You are a creative soul who loves music, travel and good vibes. You are the person to message when someone feels lonely or bored and wants a genuine conversation with someone who actually listens.",
    topics: "music, loneliness, travel stories, friendly casual chat",
  },
  Eleni: {
    languages: "English and Greek only (you do not speak Dutch or German)",
    bio: "You are very empathetic and a passionate foodie. You love helping people clear their minds and being a supportive friend, a shoulder to cry on, or a fun distraction.",
    topics: "emotional support, food and cooking, venting about work, fun distractions",
  },
};

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  NL: "Dutch",
  DE: "German",
  EL: "Greek",
};

/** Turns stored language codes into a human list like "English and Dutch". */
export function languageNames(codes: string[] | null | undefined): string[] {
  return (codes ?? []).map((c) => LANGUAGE_NAMES[c.toUpperCase()] ?? c);
}

/** Builds the strict language-boundary block for a profile. */
function languageBlock(allowed: string[]): string {
  if (!allowed.length) {
    return `\nLanguage rule: you only ever chat in English.`;
  }
  const list = allowed.join(" and ");
  return (
    `\nLanguage rule (strict, never break it): you ONLY ever write in ${list}.` +
    ` You must never use, acknowledge, understand or switch to any other language — not even for a single word, a greeting or a quote.` +
    ` If the person writes to you in another language, do not reveal that you understand it; just reply naturally in ${allowed[0]} and gently continue in ${list}.` +
    ` The person must never find out you are capable of any language beyond ${list} — as far as they know, those are simply the only languages you speak.`
  );
}

/** Builds the extra system-prompt block for a specific chat partner. */
export function personaPromptFor(name: string, languages?: string[] | null): string {
  const profile = PERSONA_PROFILES[name];
  const base = `\n\nYou are chatting as "${name}". Stay in that name and personality.`;
  const langBlock = languageBlock(languageNames(languages ?? null));
  if (!profile) return base + langBlock;
  return `${base}\nAbout you: ${profile.bio}\nLanguages: you speak ${profile.languages}.${langBlock}\nYou are most at home talking about: ${profile.topics}. Steer naturally towards these when it fits, but always follow what the person needs.`;
}

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
  // A quick "*word, sorry typo" correction is fired off fast, like a real person would.
  if (isCorrectionChunk(chunk)) return Math.min(1800, 700 + chunk.length * 18);
  const perChar = 26;
  return Math.min(MAX_TYPING_MS, Math.max(MIN_TYPING_MS, 900 + chunk.length * perChar));
}

/** True for the short follow-up that fixes a planted typo. */
export function isCorrectionChunk(chunk: string): boolean {
  return /^(\*\w|ow wait,|oops \*|lol I meant)/i.test(chunk.trim());
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

/* ------------------------------------------------------------------ */
/* Human quirk: an occasional typo, immediately followed by a fix.     */
/* ------------------------------------------------------------------ */

/** Roughly one in eight replies carries a small slip of the thumb. */
export const TYPO_CHANCE = 0.12;

const CORRECTION_TEMPLATES = [
  "ow wait, I meant {word}, sorry typo!",
  "*{word} haha, sorry, fat fingers",
  "oops *{word} — typing too fast, sorry!",
  "lol I meant {word}, sorry about that",
  "*{word}. sorry, autocorrect has a mind of its own",
];

/** Swaps two adjacent inner letters of a word, e.g. "really" -> "raelly". */
export function misspell(word: string, rand = Math.random): string {
  if (word.length < 5) return word;
  const i = 1 + Math.floor(rand() * (word.length - 3)); // never touch first/last letter
  const a = word[i]!;
  const b = word[i + 1]!;
  if (a === b) return word.slice(0, i) + word.slice(i + 1); // drop a doubled letter instead
  return word.slice(0, i) + b + a + word.slice(i + 2);
}

/**
 * Candidate words: plain Latin-alphabet words of 5+ letters. Non-Latin
 * scripts (e.g. Greek) are left alone so the English correction line never
 * appears in a chat that isn't happening in English.
 */
function typoCandidates(text: string): { index: number; word: string }[] {
  const out: { index: number; word: string }[] = [];
  const re = /\b[a-zA-Z]{5,}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0] !== m[0].toUpperCase()) out.push({ index: m.index, word: m[0] });
  }
  return out;
}

/**
 * With a small probability, plants a typo in the last chunk and appends a
 * quick, playful correction as an extra chunk. Returns the chunks unchanged
 * when the dice say no or when the text has no suitable word.
 */
export function maybeInjectTypo(
  chunks: string[],
  rand = Math.random,
  chance = TYPO_CHANCE,
): { chunks: string[]; typo: { wrong: string; right: string } | null } {
  if (!chunks.length || rand() >= chance) return { chunks, typo: null };
  const lastIndex = chunks.length - 1;
  const text = chunks[lastIndex]!;
  if (/[^\x00-\x7F]/.test(text.replace(/[’“”—…]/g, ""))) return { chunks, typo: null };
  const candidates = typoCandidates(text);
  if (!candidates.length) return { chunks, typo: null };
  const pick = candidates[Math.floor(rand() * candidates.length)]!;
  const wrong = misspell(pick.word, rand);
  if (wrong === pick.word) return { chunks, typo: null };
  const mangled = text.slice(0, pick.index) + wrong + text.slice(pick.index + pick.word.length);
  const template = CORRECTION_TEMPLATES[Math.floor(rand() * CORRECTION_TEMPLATES.length)]!;
  const fix = template.replace("{word}", pick.word);
  return {
    chunks: [...chunks.slice(0, lastIndex), mangled, fix],
    typo: { wrong, right: pick.word },
  };
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