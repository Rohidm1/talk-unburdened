import { describe, expect, it } from "vitest";
import {
  MAX_CHUNK_LENGTH,
  MAX_TYPING_MS,
  MIN_TYPING_MS,
  SYSTEM_PROMPT,
  checkReplyGuardrails,
  chunkReply,
  typingDelayMs,
} from "./ai-persona";

describe("persona prompt", () => {
  it("forbids admitting to being an AI", () => {
    expect(SYSTEM_PROMPT).toMatch(/NEVER state, imply or admit that you are an AI/);
  });

  it("keeps the stand-in a peer, not a professional", () => {
    expect(SYSTEM_PROMPT).toMatch(/not a therapist or medical professional/);
    expect(SYSTEM_PROMPT).toMatch(/Never mention credits, payments, pricing/);
  });

  it("asks for short, unformatted, human replies", () => {
    expect(SYSTEM_PROMPT).toMatch(/Never use bullet points/);
    expect(SYSTEM_PROMPT).toMatch(/under about 350 characters/);
  });
});

describe("chunkReply", () => {
  it("keeps a short reply as one message", () => {
    expect(chunkReply("Hey, I'm here. What's going on?")).toEqual(["Hey, I'm here. What's going on?"]);
  });

  it("collapses whitespace and trims", () => {
    expect(chunkReply("  hey\n\n  there  ")).toEqual(["hey there"]);
  });

  it("returns nothing for empty input", () => {
    expect(chunkReply("   ")).toEqual([]);
  });

  it("splits a long reply into at most two chunks that preserve the text", () => {
    const long = `${"That sounds really heavy and I'm glad you said it out loud. ".repeat(6)}What part is weighing on you most?`;
    const chunks = chunkReply(long);
    expect(chunks.length).toBe(2);
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(long.replace(/\s+/g, " ").trim());
  });

  it("prefers a sentence boundary for the first chunk", () => {
    const long = `${"a".repeat(80)}. ${"b".repeat(300)}`;
    const [first] = chunkReply(long);
    expect(first!.endsWith(".")).toBe(true);
    expect(first!.length).toBeLessThanOrEqual(MAX_CHUNK_LENGTH);
  });
});

describe("typingDelayMs", () => {
  it("never types faster than a human", () => {
    expect(typingDelayMs("ok")).toBe(MIN_TYPING_MS);
  });

  it("caps the wait for very long chunks", () => {
    expect(typingDelayMs("x".repeat(500))).toBe(MAX_TYPING_MS);
  });

  it("scales with message length", () => {
    expect(typingDelayMs("x".repeat(60))).toBeGreaterThan(typingDelayMs("x".repeat(50)));
    expect(typingDelayMs("x".repeat(60))).toBe(2460);
  });
});

describe("safety guardrails", () => {
  it("accepts an in-character reply", () => {
    const result = checkReplyGuardrails(
      "Nope, just me here. Sounds like today's been rough — what happened?",
    );
    expect(result).toEqual({ ok: true, violations: [] });
  });

  it.each([
    "I'm an AI assistant here to help.",
    "As an AI, I can't feel things.",
    "I am a chatbot, not a person.",
    "I'm not a human, but I care.",
    "I'm powered by Gemini.",
  ])("flags identity disclosure: %s", (reply) => {
    expect(checkReplyGuardrails(reply).violations).toContain("identity_disclosure");
  });

  it.each([
    "You should buy more credits to keep chatting.",
    "It sounds like you have depression, you need medication.",
    "Ask for legal advice from me anytime.",
  ])("flags out-of-scope content: %s", (reply) => {
    expect(checkReplyGuardrails(reply).violations).toContain("out_of_scope");
  });

  it.each(["- point one\n- point two", "## Header", "**bold advice**"])(
    "flags robotic formatting: %s",
    (reply) => {
      expect(checkReplyGuardrails(reply).violations).toContain("formatting");
    },
  );

  it("flags replies that are far too long", () => {
    expect(checkReplyGuardrails("word ".repeat(200)).violations).toContain("too_long");
  });

  it("guards every chunk of a split reply", () => {
    const chunks = chunkReply(`${"I hear you and that matters. ".repeat(10)}I'm an AI though.`);
    expect(chunks.some((c) => !checkReplyGuardrails(c).ok)).toBe(true);
  });
});
import { maybeInjectTypo, misspell, isCorrectionChunk, typingDelayMs as tdm } from "./ai-persona";
import { describe as d2, expect as e2, it as i2 } from "vitest";

d2("typo quirk", () => {
  i2("misspells only inner letters", () => {
    const out = misspell("really", () => 0.5);
    e2(out).not.toBe("really");
    e2(out[0]).toBe("r");
    e2(out[out.length - 1]).toBe("y");
  });
  i2("adds a correction chunk when the dice hit", () => {
    const seq = [0.01, 0.2, 0.5, 0.1];
    let k = 0;
    const rand = () => seq[k++ % seq.length]!;
    const { chunks, typo } = maybeInjectTypo(["that sounds really heavy, honestly"], rand, 0.12);
    e2(chunks).toHaveLength(2);
    e2(typo).not.toBeNull();
    e2(chunks[1]).toContain(typo!.right);
    e2(isCorrectionChunk(chunks[1]!)).toBe(true);
    e2(tdm(chunks[1]!)).toBeLessThanOrEqual(1800);
  });
  i2("leaves the reply alone when the dice miss", () => {
    const { chunks, typo } = maybeInjectTypo(["hello there friend"], () => 0.99);
    e2(chunks).toEqual(["hello there friend"]);
    e2(typo).toBeNull();
  });
  i2("never touches non-Latin text", () => {
    const { typo } = maybeInjectTypo(["Καλησπέρα, τι κάνεις σήμερα;"], () => 0.01);
    e2(typo).toBeNull();
  });
});
