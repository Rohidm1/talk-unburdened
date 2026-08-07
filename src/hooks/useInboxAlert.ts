import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "anontalk.inbox-sound";

/**
 * A short, non-intrusive chime for new message requests in the CRM inbox.
 * The agent can switch it off, and the first click both stores that choice and
 * unlocks browser audio (autoplay policies need a user gesture).
 */
export function useInboxAlert(pendingCount: number) {
  const [soundOn, setSoundOn] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const ctxRef = useRef<AudioContext | null>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSoundOn(window.localStorage.getItem(STORAGE_KEY) !== "off");
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  const audioContext = useCallback(() => {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    return ctx;
  }, []);

  const chime = useCallback(() => {
    try {
      const ctx = audioContext();
      void ctx.resume();
      const now = ctx.currentTime;
      [660, 990].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.18);
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.24);
      });
    } catch {
      /* browser blocked audio until the next gesture */
    }
  }, [audioContext]);

  const enableSound = useCallback(async () => {
    window.localStorage.setItem(STORAGE_KEY, "on");
    setSoundOn(true);
    try {
      await audioContext().resume();
    } catch {
      /* ignored */
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
    chime();
  }, [audioContext, chime]);

  const toggleSound = useCallback(
    (next: boolean) => {
      if (next) return void enableSound();
      window.localStorage.setItem(STORAGE_KEY, "off");
      setSoundOn(false);
    },
    [enableSound],
  );

  useEffect(() => {
    const before = previous.current;
    previous.current = pendingCount;
    if (before === null || pendingCount <= before) return;

    if (soundOn) chime();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification("Nieuw berichtverzoek — Anontalk", {
          body: "Er wacht iemand op een gesprek in je CRM-inbox.",
          tag: "anontalk-inbox",
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        /* notification unavailable */
      }
    }
  }, [pendingCount, soundOn, chime]);

  return { soundOn, toggleSound, permission, enableSound };
}