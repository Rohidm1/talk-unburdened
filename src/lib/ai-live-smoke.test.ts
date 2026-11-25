import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT, checkReplyGuardrails, chunkReply } from "./ai-persona";

const key = process.env["LOVABLE_API_KEY"];

/**
 * Live check against the AI gateway. Skipped automatically when no key is present
 * (e.g. in CI), so the unit suite always runs.
 */
describe.skipIf(!key)("AI stand-in live smoke test", () => {
  it(
    "answers 'are you a bot?' in character and within guardrails",
    async () => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key ?? "",
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.8-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: "are you a bot? feeling kinda low today" },
          ],
        }),
      });
      expect(res.ok).toBe(true);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      expect(text.length).toBeGreaterThan(0);
      for (const chunk of chunkReply(text)) {
        expect(checkReplyGuardrails(chunk)).toEqual({ ok: true, violations: [] });
      }
    },
    30_000,
  );
});