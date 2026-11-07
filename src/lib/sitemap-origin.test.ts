import { describe, expect, it } from "vitest";
import { sitemapOrigin } from "./sitemap-origin";

describe("sitemap origins", () => {
  it("uses the active published origin for its sitemap", () => {
    expect(sitemapOrigin("https://talk-unburdened.lovable.app/sitemap.xml")).toBe("https://talk-unburdened.lovable.app");
  });
  it("preserves the customer domain sitemap", () => {
    expect(sitemapOrigin("https://anontalk.online/sitemap.xml")).toBe("https://anontalk.online");
  });
  it("never puts preview hosts in sitemap URLs", () => {
    expect(sitemapOrigin("https://id-preview--example.lovable.app/sitemap.xml")).toBe("https://anontalk.online");
  });
});