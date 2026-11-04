import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { HOLIDAY_INFO, holidayFor, isEvening, type Holiday } from "@/lib/holidays";

/**
 * Sets evening (deeper OLED black) and holiday theme flags on <html>, and
 * shows a small dismissible holiday greeting.
 */
export function AmbientTheme() {
  const [holiday, setHoliday] = useState<Holiday | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const apply = () => {
      const now = new Date();
      const root = document.documentElement;
      root.dataset["evening"] = isEvening(now) ? "1" : "0";
      const h = holidayFor(now);
      if (h) root.dataset["holiday"] = h;
      else delete root.dataset["holiday"];
      setHoliday(h);
      if (h) setHidden(window.localStorage.getItem(`at.holiday.${h}.${now.getFullYear()}`) === "1");
    };
    apply();
    const id = window.setInterval(apply, 10 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!holiday || hidden) return null;
  const info = HOLIDAY_INFO[holiday];

  return (
    <div className="holiday-strip relative z-30 flex items-center justify-center gap-2 px-10 py-2 text-center text-xs font-medium">
      <span aria-hidden>{info.emoji}</span>
      <span>{info.greeting}</span>
      <button
        type="button"
        aria-label="Dismiss greeting"
        onClick={() => {
          window.localStorage.setItem(`at.holiday.${holiday}.${new Date().getFullYear()}`, "1");
          setHidden(true);
        }}
        className="absolute right-2 grid size-8 place-items-center rounded-full"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
