import { useEffect } from "react";
import { haptic } from "@/lib/native";
import { playSfx } from "@/lib/sfx";

/** Easter-egg reward animation: floating hearts + message, auto-dismisses. */
export function Celebration({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    playSfx("levelup");
    haptic([30, 50, 30, 50, 60]);
    const t = window.setTimeout(onDone, 4500);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div role="status" className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center" onClick={onDone}>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="celebrate-float absolute bottom-0 text-2xl"
          style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.25}s` }}
        >
          {["💛", "✨", "🪽", "🌟"][i % 4]}
        </span>
      ))}
      <div className="pop-once pointer-events-auto mx-6 rounded-3xl border border-primary/50 bg-popover px-6 py-5 text-center shadow-[var(--shadow-glow)]">
        <p className="font-display text-lg font-semibold">{message}</p>
      </div>
    </div>
  );
}
