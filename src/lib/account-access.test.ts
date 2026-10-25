import { describe, expect, it } from "vitest";
import { hasVerifiedEmail, registrationSchema } from "./account-access";
import { FREE_TRIAL_MESSAGES } from "./credit-packages";

describe("customer registration rules", () => {
  it("requires at least eight password characters", () => {
    expect(registrationSchema.safeParse({ email: "anon@example.com", alias: "Anon", password: "1234567" }).success).toBe(false);
    expect(registrationSchema.safeParse({ email: "anon@example.com", alias: "Anon", password: "12345678" }).success).toBe(true);
  });
  it("requires a valid email", () => {
    expect(registrationSchema.safeParse({ email: "not-an-email", alias: "Anon", password: "12345678" }).success).toBe(false);
  });
  it("requires a chosen nickname", () => {
    expect(registrationSchema.safeParse({ email: "anon@example.com", alias: "  ", password: "12345678" }).success).toBe(false);
  });
  it("requires verified, nonanonymous accounts", () => {
    expect(hasVerifiedEmail(null)).toBe(false);
    expect(hasVerifiedEmail({ email_confirmed_at: null })).toBe(false);
    expect(hasVerifiedEmail({ email_confirmed_at: "2026-10-25", is_anonymous: true })).toBe(false);
    expect(hasVerifiedEmail({ email_confirmed_at: "2026-10-25" })).toBe(true);
  });
  it("grants five initial free sent messages", () => {
    expect(FREE_TRIAL_MESSAGES).toBe(5);
  });
});