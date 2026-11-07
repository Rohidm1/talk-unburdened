import { describe, expect, it } from "vitest";
import { MAX_OPEN_CHATS, NOTE_CATEGORIES, canReceiveChat, periodStart } from "@/lib/portal-rules";

describe("Open Ear routing rules", () => {
  it("caps each agent at 2 open chats", () => {
    expect(MAX_OPEN_CHATS).toBe(2);
    expect(canReceiveChat("available", 1)).toBe(true);
    expect(canReceiveChat("available", 2)).toBe(false);
  });
  it("only sends chats to agents who are Online", () => {
    expect(canReceiveChat("break", 0)).toBe(false);
    expect(canReceiveChat("offline", 0)).toBe(false);
  });
});

describe("analytics periods", () => {
  const now = new Date("2026-11-07T15:30:00Z"); // a Saturday
  it("day starts at midnight UTC", () => {
    expect(periodStart("day", now).toISOString()).toBe("2026-11-07T00:00:00.000Z");
  });
  it("week starts on Monday", () => {
    expect(periodStart("week", now).toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });
  it("month starts on the 1st", () => {
    expect(periodStart("month", now).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("customer info logger", () => {
  it("offers exactly the requested categories", () => {
    expect([...NOTE_CATEGORIES]).toEqual(["Name", "Age", "Address", "Current Situation", "Health", "Family", "Pets"]);
  });
});
