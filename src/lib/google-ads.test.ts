import { describe, expect, it } from "vitest";
import { isFreshVerifiedSignup, SIGNUP_SEND_TO, GOOGLE_ADS_ID } from "./google-ads";

const now = Date.parse("2026-11-05T12:00:00Z");

describe("verified sign-up conversion", () => {
  it("counts a sign-up verified an hour ago", () => {
    expect(isFreshVerifiedSignup({ id: "u", email_confirmed_at: "2026-11-05T11:00:00Z" }, now, false)).toBe(true);
  });
  it("does not count an unverified account", () => {
    expect(isFreshVerifiedSignup({ id: "u", email_confirmed_at: null }, now, false)).toBe(false);
  });
  it("does not count an old account signing in again (verified 3 days ago)", () => {
    expect(isFreshVerifiedSignup({ id: "u", email_confirmed_at: "2026-11-02T12:00:00Z" }, now, false)).toBe(false);
  });
  it("counts only once per browser", () => {
    expect(isFreshVerifiedSignup({ id: "u", email_confirmed_at: "2026-11-05T11:00:00Z" }, now, true)).toBe(false);
  });
  it("reports to this account's sign-up conversion", () => {
    expect(SIGNUP_SEND_TO.startsWith(`${GOOGLE_ADS_ID}/`)).toBe(true);
  });
});
