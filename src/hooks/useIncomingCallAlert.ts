import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Rings a repeating tone and raises a browser notification while a call is
 * waiting to be answered, so listeners don't miss calls on a background tab.
 */
export function useIncomingCallAlert(active: boolean, title = "Incoming call — Anontalk") {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const originalTitleRef = useRef<string>("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    // Unlock audio playback on this user gesture.
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = ctxRef.current ?? new Ctx();
      ctxRef.current = ctx;
      await ctx.resume();
    } catch {
      /* audio stays silent until the next gesture */
    }
  }, []);

  const beep = useCallback(() => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = ctxRef.current ?? new Ctx();
      ctxRef.current = ctx;
      void ctx.resume();
      const now = ctx.currentTime;
      [0, 0.35].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.28);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.3);
      });
    } catch {
      /* ignore — browser blocked audio */
    }
  }, []);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    originalTitleRef.current = document.title;
    let flash = false;
    beep();
    timerRef.current = setInterval(() => {
      beep();
      flash = !flash;
      document.title = flash ? "📞 Incoming call…" : originalTitleRef.current;
    }, 2000);

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification(title, {
          body: "Someone would like to talk. Open your listener desk to accept.",
          tag: "anontalk-incoming",
          requireInteraction: true,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        notificationRef.current = n;
      } catch {
        /* notification not available */
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      document.title = originalTitleRef.current || document.title;
      notificationRef.current?.close();
      notificationRef.current = null;
    };
  }, [active, beep, title]);

  return { permission, requestPermission };
}
