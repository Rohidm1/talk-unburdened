/** Per-device alert preferences (granular toggles in My account → App settings). */
export type AlertKind = "chat" | "bottles" | "community" | "wellness" | "buddies";
const KEY = "at.alert.prefs";
const DEFAULTS: Record<AlertKind, boolean> = { chat: true, bottles: true, community: true, wellness: true, buddies: true };

export function getAlertPrefs(): Record<AlertKind, boolean> {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Record<AlertKind, boolean>>) };
  } catch {
    return DEFAULTS;
  }
}

export function setAlertPref(kind: AlertKind, on: boolean) {
  window.localStorage.setItem(KEY, JSON.stringify({ ...getAlertPrefs(), [kind]: on }));
}

export function alertAllowed(kind: AlertKind | undefined): boolean {
  return !kind || getAlertPrefs()[kind];
}
