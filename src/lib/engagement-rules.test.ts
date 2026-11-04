import { describe, expect, it } from "vitest";
import { checkMessage } from "./safety";
import { easterSunday, holidayFor, isEvening } from "./holidays";
import { wingLevel } from "./wings";
import { HELPLINES } from "@/data/helplines";

describe("word filter", () => {
  it("flags possible self-harm so helplines are offered", () => {
    expect(checkMessage("honestly I want to die")).toBe("selfharm");
    expect(checkMessage("I keep thinking about suicide")).toBe("selfharm");
  });
  it("flags harassment", () => {
    expect(checkMessage("fuck you")).toBe("toxic");
    expect(checkMessage("you're worthless")).toBe("toxic");
  });
  it("lets ordinary messages through", () => {
    expect(checkMessage("I had a rough day at work")).toBe("ok");
  });
});

describe("holiday engine", () => {
  it("computes Western Easter", () => {
    expect(easterSunday(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
    expect(easterSunday(2027).toDateString()).toBe(new Date(2027, 2, 28).toDateString());
  });
  it("detects the requested holidays", () => {
    expect(holidayFor(new Date(2026, 11, 24))).toBe("christmas");
    expect(holidayFor(new Date(2026, 11, 31))).toBe("newyear");
    expect(holidayFor(new Date(2027, 0, 1))).toBe("newyear");
    expect(holidayFor(new Date(2026, 9, 31))).toBe("halloween");
    expect(holidayFor(new Date(2027, 1, 14))).toBe("valentine");
    expect(holidayFor(new Date(2026, 3, 5))).toBe("easter");
    expect(holidayFor(new Date(2026, 6, 15))).toBeNull();
  });
  it("switches to the evening theme from 20:00 to 06:00", () => {
    expect(isEvening(new Date(2026, 0, 1, 21))).toBe(true);
    expect(isEvening(new Date(2026, 0, 1, 5))).toBe(true);
    expect(isEvening(new Date(2026, 0, 1, 12))).toBe(false);
  });
});

describe("support wings", () => {
  it("levels up at the right thresholds", () => {
    expect(wingLevel(0).name).toBe("Fledgling");
    expect(wingLevel(10).name).toBe("Listener");
    expect(wingLevel(150).name).toBe("Lighthouse");
  });
});

describe("crisis helplines", () => {
  it("lists the requested official numbers", () => {
    const tel = Object.fromEntries(HELPLINES.map((h) => [h.country, h.contact]));
    expect(tel["Netherlands"]).toContain("113");
    expect(tel["Netherlands"]).toContain("0800-0113");
    expect(tel["Belgium"]).toContain("1813");
    expect(tel["Greece"]).toContain("1018");
    expect(tel["United States"]).toContain("988");
    expect(tel["Germany"]).toContain("0800 111 0 111");
    expect(tel["Germany"]).toContain("0800 111 0 222");
  });
});
