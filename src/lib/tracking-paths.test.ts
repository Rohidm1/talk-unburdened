import { describe, expect, it } from "vitest";
import { isTrackablePath } from "./tracking-paths";

describe("isTrackablePath", () => {
  it("excludes team and admin pages", () => {
    for (const p of ["/crm", "/crm/", "/crm/messages", "/crm-login", "/admin", "/admin/users", "/CRM"]) {
      expect(isTrackablePath(p)).toBe(false);
    }
  });
  it("counts public visitor pages", () => {
    for (const p of ["/", "/wellness", "/bottles", "/speed-chat", "/blog/x", "/auth", "/community"]) {
      expect(isTrackablePath(p)).toBe(true);
    }
  });
});
