import { useEffect } from "react";
import { toast } from "sonner";
import { alertAllowed } from "@/lib/prefs";
import { alertUser } from "@/lib/native";
import { openSos } from "@/lib/safety";
import { welcomeAccepted } from "@/components/site/WelcomeGate";

const KEY = "at.wellness.reminded";

/**
 * Gentle check-in during high-stress hours (weekday evenings 20–23h and
 * weekend afternoons/evenings), at most once a day, only if switched on.
 */
export function WellnessReminder() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      const now = new Date();
      const h = now.getHours();
      const weekend = now.getDay() === 0 || now.getDay() === 6;
      const inWindow = weekend ? h >= 15 && h < 23 : h >= 20 && h < 23;
      const today = now.toISOString().slice(0, 10);
      if (!inWindow || !welcomeAccepted() || !alertAllowed("wellness") || window.localStorage.getItem(KEY) === today) return;
      window.localStorage.setItem(KEY, today);
      if (document.visibilityState === "visible") {
        toast("How are you holding up tonight?", {
          description: "One calm minute can reset a long day.",
          action: { label: "Mood SOS", onClick: openSos },
          duration: 10000,
        });
      } else {
        alertUser({ title: "A minute for you", body: "How are you holding up? Take one calm breath with us.", url: "/wellness", kind: "wellness", tag: "wellness" });
      }
    }, 45_000);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
