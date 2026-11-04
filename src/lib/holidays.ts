/** Automatic holiday themes (secular/international + Christmas/Easter, as requested). */
export type Holiday = "christmas" | "newyear" | "easter" | "halloween" | "valentine";

export const HOLIDAY_INFO: Record<Holiday, { greeting: string; emoji: string }> = {
  christmas: { greeting: "Warm wishes this Christmas — you're not alone tonight.", emoji: "🎄" },
  newyear: { greeting: "Happy New Year! A fresh page, at your own pace.", emoji: "🎆" },
  easter: { greeting: "Happy Easter — a little light for your week.", emoji: "🌷" },
  halloween: { greeting: "Happy Halloween — the only scary thing here is nothing.", emoji: "🎃" },
  valentine: { greeting: "Valentine's can feel lonely. Someone here wants to listen.", emoji: "💛" },
};

/** Western (Gregorian) Easter Sunday — anonymous Gregorian algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function holidayFor(date: Date): Holiday | null {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 12 && d >= 31) || (m === 1 && d <= 2)) return "newyear";
  if (m === 12 && d >= 20 && d <= 26) return "christmas";
  if (m === 10 && d >= 25) return "halloween";
  if (m === 2 && d >= 10 && d <= 14) return "valentine";
  const easter = easterSunday(y);
  const today = new Date(y, m - 1, d).getTime();
  const diff = (today - easter.getTime()) / 86_400_000;
  if (diff >= -2 && diff <= 1) return "easter";
  return null;
}

/** Evening hours get the deeper OLED-black theme. */
export function isEvening(date: Date): boolean {
  const h = date.getHours();
  return h >= 20 || h < 6;
}
