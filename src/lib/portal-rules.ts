import { ANALYTICS_RESET_AT } from "@/lib/analytics-baseline";

export type Period = "day" | "week" | "month";

/** Agents may hold at most this many open chats at once. */
export const MAX_OPEN_CHATS = 2;

/** Categories agents can log customer details under. */
export const NOTE_CATEGORIES = [
  "Name",
  "Age",
  "Address",
  "Current Situation",
  "Health",
  "Family",
  "Pets",
] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

/** Start of the current UTC day, week (Monday) or month, never before the analytics reset. */
export function periodStart(period: Period, now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "week") {
    const offset = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - offset);
  } else if (period === "month") {
    d.setUTCDate(1);
  }
  const reset = new Date(ANALYTICS_RESET_AT);
  return d < reset ? reset : d;
}

/** Only agents switched to Online with a free slot may receive a new chat. */
export function canReceiveChat(availability: string, openChats: number): boolean {
  return availability === "available" && openChats < MAX_OPEN_CHATS;
}
