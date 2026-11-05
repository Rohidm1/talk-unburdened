import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_KEY, CONSENT_NOTICE_VERSION, getConsentHistory, setConsent } from "./consent";
import { adsAllowed, loadGoogleAds, reportVerifiedSignup } from "./google-ads";

describe("advertising consent", () => {
  const store = new Map<string, string>();
  const gtag = vi.fn();
  beforeEach(() => {
    store.clear(); gtag.mockClear();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
      gtag, dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("CustomEvent", class { constructor(public type: string) {} });
    vi.stubGlobal("document", { querySelector: () => ({}) });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("retains dated acceptance when advertising is withdrawn", () => {
    setConsent("accepted"); setConsent("essential");
    const records = getConsentHistory();
    expect(records.map(r => r.choice)).toEqual(["accepted", "essential"]);
    expect(records[0]?.noticeVersion).toBe(CONSENT_NOTICE_VERSION);
    expect(Number.isFinite(Date.parse(records[0]?.decidedAt ?? ""))).toBe(true);
    expect(adsAllowed()).toBe(false);
  });
  it("denies advertising after withdrawal and grants it after re-acceptance on an existing tag", () => {
    setConsent("essential"); expect(loadGoogleAds()).toBe(false);
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    setConsent("accepted"); expect(loadGoogleAds()).toBe(true);
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  });
  it("does not authorize a legacy acceptance without evidence", () => {
    store.set(CONSENT_KEY, "accepted");
    expect(adsAllowed()).toBe(false);
  });
  it("never replays a conversion blocked before later acceptance", () => {
    const user = { id: "blocked-user", email_confirmed_at: new Date().toISOString() };
    setConsent("essential"); reportVerifiedSignup(user);
    setConsent("accepted"); reportVerifiedSignup(user);
    expect(gtag.mock.calls.filter(c => c[0] === "event")).toHaveLength(0);
  });
  it("links a permitted conversion to its consent evidence", () => {
    setConsent("accepted");
    reportVerifiedSignup({ id: "permitted-user", email_confirmed_at: new Date().toISOString() });
    const reference = JSON.parse(store.get("at.ads.signup.permitted-user.consent") ?? "{}");
    expect(reference.recordId).toBe(getConsentHistory()[0]?.id);
    expect(reference.choice).toBe("accepted");
    expect(gtag.mock.calls.filter(c => c[0] === "event")).toHaveLength(1);
  });
});