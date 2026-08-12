import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { playSfx } from "@/lib/sfx";

export const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "lonely", emoji: "🌙", label: "Lonely" },
  { id: "venting", emoji: "🌪️", label: "Venting" },
  { id: "bored", emoji: "🎲", label: "Bored" },
  { id: "anxious", emoji: "💭", label: "Anxious" },
  { id: "hopeful", emoji: "✨", label: "Hopeful" },
] as const;

export type MoodId = (typeof MOODS)[number]["id"];

/** Live-ish global activity counter (simulated, drifts gently). */
export function useLiveCounter(seed = 1242) {
  const [count, setCount] = useState(seed);
  useEffect(() => {
    const id = window.setInterval(() => {
      setCount((c) => {
        const drift = Math.round((Math.random() - 0.45) * 9);
        return Math.min(2400, Math.max(880, c + drift));
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, []);
  return count;
}

export function LiveActivityCounter({ className = "" }: { className?: string }) {
  const count = useLiveCounter();
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-black/40 px-3 py-1 text-xs backdrop-blur ${className}`}
    >
      <span className="size-2 animate-pulse rounded-full bg-neon-cyan shadow-[0_0_12px_var(--neon-cyan)]" />
      <span className="neon-text font-semibold tabular-nums">{count.toLocaleString()}</span>
      <span className="text-muted-foreground">users online chatting</span>
    </span>
  );
}

export function MoodDialog({
  open,
  onCancel,
  onPick,
}: {
  open: boolean;
  onCancel: () => void;
  onPick: (mood: MoodId) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">How are you feeling right now?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pick a mood so we can tune who you're matched with. It stays private.
        </p>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                playSfx("click");
                onPick(m.id);
              }}
              className="neon-glow glass flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-sm hover:border-primary"
            >
              <span className="text-2xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MatchingRadar({
  open,
  mood,
  partnerName,
  onCancel,
}: {
  open: boolean;
  mood: MoodId | null;
  partnerName?: string;
  onCancel: () => void;
}) {
  const moodLabel = useMemo(() => MOODS.find((m) => m.id === mood)?.label ?? "any mood", [mood]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Searching for a match…</DialogTitle>
        </DialogHeader>

        <div className="relative mx-auto my-4 grid size-56 place-items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 0.8}s` }}
              className="ping-ring absolute size-56 rounded-full border border-primary/50"
            />
          ))}
          <span className="absolute size-56 rounded-full border border-primary/25" />
          <span className="absolute size-36 rounded-full border border-neon-cyan/30" />
          <span className="absolute size-16 rounded-full border border-neon-rose/40" />
          <span
            className="radar-sweep absolute size-56 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--neon-cyan) 45%, transparent) 40deg, transparent 70deg)",
            }}
          />
          <span className="size-3 rounded-full bg-primary shadow-[0_0_24px_var(--neon-purple)]" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Matching you with {partnerName ?? "someone"} · mood: <span className="text-foreground">{moodLabel}</span>
        </p>
        <div className="flex justify-center pt-1">
          <LiveActivityCounter />
        </div>
        <Button variant="outline" className="mt-3" onClick={onCancel}>
          Cancel search
        </Button>
      </DialogContent>
    </Dialog>
  );
}