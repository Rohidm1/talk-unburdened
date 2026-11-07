import { describe, expect, it } from "vitest";
import { AI_REPLIES_ENABLED } from "@/lib/ai-fallback.functions";

describe("automatic chat replies", () => {
  it("are switched off so only team members reply", () => {
    expect(AI_REPLIES_ENABLED).toBe(false);
  });
});
