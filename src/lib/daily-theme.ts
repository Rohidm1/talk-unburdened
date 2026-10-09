export const DAILY_THEMES = ["midnight-neon", "deep-ocean", "sunset-amethyst"] as const;

/** Same palette for everyone on a given (UTC) day. */
export function dailyTheme(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return DAILY_THEMES[day % DAILY_THEMES.length]!;
}
