import { describe, expect, it } from "vitest";
import { publishedDilemmas, isDilemmaId, type PublicDilemma } from "./dilemma-public";

describe("public dilemma visibility", () => {
  it("excludes future prompts from public pages and sitemap candidates", () => {
    const prompt = (day: string): PublicDilemma => ({ id: day, day, question: "Choose?", option_a: "A", option_b: "B" });
    expect(publishedDilemmas([prompt("2026-10-28"), prompt("2026-10-29"), prompt("2026-10-30")], "2026-10-29").map((d) => d.day)).toEqual(["2026-10-28", "2026-10-29"]);
  });
  it("rejects invalid item identifiers", () => {
    expect(isDilemmaId("../../account")).toBe(false);
    expect(isDilemmaId("not-a-dilemma")).toBe(false);
    expect(isDilemmaId("12345678-1234-1234-1234-123456789abc")).toBe(true);
  });
});