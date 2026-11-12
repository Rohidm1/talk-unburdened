import { describe, expect, it } from "vitest";
import { CREDIT_PACKAGES, FREE_TRIAL_MESSAGES, PACKAGE_BY_PLAY_PRODUCT_ID, totalCredits } from "./credit-packages";
import { isNoCreditError } from "./native";

describe("credit rules", () => {
  it("new accounts get 5 free welcome credits", () => {
    expect(FREE_TRIAL_MESSAGES).toBe(5);
  });

  it("bundles add their bonus credits on top of the paid credits", () => {
    expect(totalCredits(CREDIT_PACKAGES.starter)).toBe(30);
    expect(totalCredits(CREDIT_PACKAGES.popular)).toBe(100);
    expect(totalCredits(CREDIT_PACKAGES.pro_value)).toBe(220);
    expect(totalCredits(CREDIT_PACKAGES.vip_club)).toBe(500);
  });

  it("every bundle can be bought through Google Play with its own product ID", () => {
    expect(PACKAGE_BY_PLAY_PRODUCT_ID["credits_popular"]?.key).toBe("popular");
    expect(Object.keys(PACKAGE_BY_PLAY_PRODUCT_ID)).toHaveLength(4);
  });

  it("recognises the out-of-credit error from the database", () => {
    expect(isNoCreditError("no_credit")).toBe(true);
    expect(isNoCreditError("daily_limit")).toBe(false);
  });
});

import { PACKAGE_BY_PLAY_PRODUCT_ID as PLAY_MAP, CREDIT_PACKAGES as PKGS } from "./credit-packages";
describe("Try-it pack", () => {
  it("costs $2.99 for 10 messages", () => {
    expect(PKGS.trial.cents).toBe(299);
    expect(PKGS.trial.credits + PKGS.trial.bonus).toBe(10);
  });
  it("is never granted through Google Play", () => {
    expect(PLAY_MAP["credits_trial"]).toBeUndefined();
  });
});
