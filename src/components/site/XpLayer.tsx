import { useEffect, useState } from "react";
import { Flame, Sparkle } from "lucide-react";

type Pop = { id: number; label: string };

/** Floating "+XP" indicators and level-up flashes. */
export function XpLayer() {
  const [pops, setPops] = useState<Pop[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  useEffect(() => {
    const onXp = (e: Event) => {
      const { label } = (e as CustomEvent<{ amount: number; label: string }>).detail;
      const id = Date.now() + Math.random();
      setPops((p) => [...p, { id, label }]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1500);
    };
    const onLevel = (e: Event) => {
      setLevelUp((e as CustomEvent<number>).detail);
      window.setTimeout(() => setLevelUp(null), 2600);
    };
    window.addEventListener("at:xp", onXp);
    window.addEventListener("at:levelup", onLevel);
    return () => {
      window.removeEventListener("at:xp", onXp);
      window.removeEventListener("at:levelup", onLevel);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-1">
      {pops.map((p) => (
        <span
          key={p.id}
          className="xp-float neon-text rounded-full border border-neon-cyan/50 bg-black/70 px-3 py-1 text-sm font-semibold backdrop-blur"
        >
          <Sparkle className="mr-1 inline size-3.5" />
          {p.label}
        </span>
      ))}
      {levelUp ? (
        <span className="pop-once mt-2 rounded-2xl border border-primary/60 bg-black/80 px-5 py-3 font-display text-lg font-semibold text-primary shadow-[var(--shadow-glow)] backdrop-blur">
          <Flame className="mr-2 inline size-5" />
          Level {levelUp} unlocked!
        </span>
      ) : null}
    </div>
  );
}