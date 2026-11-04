/**
 * Native-feel helpers: haptics, system notifications and the global paywall trigger.
 * Every function is safe to call during SSR (it just does nothing).
 */
import { isMuted, playSfx, type SfxName } from "@/lib/sfx";

const HAPTICS_KEY = "at.haptics.off";

export function hapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HAPTICS_KEY) !== "1";
}

export function setHapticsEnabled(on: boolean) {
  window.localStorage.setItem(HAPTICS_KEY, on ? "0" : "1");
}

/** Short vibration via the Web Vibration API (Android). */
export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator === "undefined" || !hapticsEnabled()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

/** Alert = sound + vibration + system notification when the app is in the background. */
export function alertUser(opts: { title: string; body: string; url?: string; sound?: SfxName; tag?: string }) {
  if (typeof window === "undefined") return;
  if (!isMuted()) playSfx(opts.sound ?? "receive");
  haptic([30, 40, 30]);
  if (document.visibilityState === "visible") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const show = async () => {
    const reg = await navigator.serviceWorker?.getRegistration("/push-sw.js").catch(() => undefined);
    const options: NotificationOptions = {
      body: opts.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      ...(opts.tag ? { tag: opts.tag } : {}),
      data: { url: opts.url ?? "/" },
    };
    if (reg) await reg.showNotification(opts.title, options);
    else {
      const n = new Notification(opts.title, options);
      n.onclick = () => {
        window.focus();
        if (opts.url) window.location.href = opts.url;
      };
    }
  };
  void show().catch(() => undefined);
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Ask for notification permission and register the notification worker. */
export async function enableNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted" && "serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/push-sw.js", { scope: "/" }).catch(() => undefined);
  }
  return result;
}

/** Opens the credit paywall from anywhere (mounted once in the root layout). */
export function openPaywall(reason: "free_used" | "no_credit" = "no_credit") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("at:paywall", { detail: reason }));
}

/** True when a database error means the user has no credits left. */
export function isNoCreditError(message: string | undefined | null): boolean {
  return !!message && message.includes("no_credit");
}
