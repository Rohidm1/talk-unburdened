/**
 * Analytics baseline: every dashboard metric counts from this moment on.
 * The admin panel was reset on 4 Sep 2026 so tracking officially starts
 * fresh from that day; anything older is ignored by the reporting queries.
 */
export const ANALYTICS_RESET_AT = "2026-09-04T00:00:00.000Z";

/** Clamps a "since" ISO timestamp so it never reaches back before the reset. */
export function clampToBaseline(sinceIso: string): string {
  return sinceIso < ANALYTICS_RESET_AT ? ANALYTICS_RESET_AT : sinceIso;
}
