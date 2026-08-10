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
    expect(SYSTEM_PROMPT).toMatch(/under about 400 characters/);
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
    expect(typingDelayMs("x".repeat(60))).toBe(2400);
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