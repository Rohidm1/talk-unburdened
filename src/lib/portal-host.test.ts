import { describe, expect, it } from "vitest";
import { isPortalHost, isPortalPath, shouldRedirectToPortal } from "./portal-host";

describe("portal address rules", () => {
  it("recognises the portal's own hosts", () => {
    expect(isPortalHost("openearteam.com")).toBe(true);
    expect(isPortalHost("www.openearteam.com")).toBe(true);
    expect(isPortalHost("OpenEarTeam.com")).toBe(true);
    expect(isPortalHost("openearteam.com:8080")).toBe(true);
  });

  it("rejects customer and look-alike hosts", () => {
    expect(isPortalHost("anontalk.online")).toBe(false);
    expect(isPortalHost("www.anontalk.online")).toBe(false);
    expect(isPortalHost("openearteam.com.evil.test")).toBe(false);
    expect(isPortalHost("noteamearteam.com")).toBe(false);
    expect(isPortalHost(null)).toBe(false);
    expect(isPortalHost("")).toBe(false);
  });

  it("treats only portal pages as portal paths", () => {
    expect(isPortalPath("/crm")).toBe(true);
    expect(isPortalPath("/crm/")).toBe(true);
    expect(isPortalPath("/crm-login")).toBe(true);
    expect(isPortalPath("/crm-login?x=1")).toBe(true);
    expect(isPortalPath("/")).toBe(false);
    expect(isPortalPath("/blog")).toBe(false);
    expect(isPortalPath("/crmfoo")).toBe(false);
    expect(isPortalPath("/account")).toBe(false);
  });

  it("never redirects a portal page on the portal address", () => {
    // Off the portal address nothing is redirected; on it, only non-portal pages are.
    expect(shouldRedirectToPortal("/crm")).toBe(false);
    expect(shouldRedirectToPortal("/crm-login")).toBe(false);
  });
});
