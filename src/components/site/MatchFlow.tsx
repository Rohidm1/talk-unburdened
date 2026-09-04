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

export const DEPTHS = [
  { id: "cosy", emoji: "🛋️", label: "Cosy chat", hint: "Light, easy and warm" },
  { id: "deep", emoji: "🌊", label: "Deep talk", hint: "Real questions, real answers" },
  { id: "venting", emoji: "🌪️", label: "Venting", hint: "You talk, they listen" },
] as const;

export type DepthId = (typeof DEPTHS)[number]["id"];

/** Reassuring, gently drifting average wait time. */
export function MatchGuarantee({ className = "" }: { className?: string }) {
  const [seconds, setSeconds] = useState(4);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(() => Math.round((3 + Math.random() * 3) * 10) / 10);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-neon-rose/40 bg-black/40 px-3 py-1 text-xs backdrop-blur ${className}`}
    >
      <span className="size-2 animate-pulse rounded-full bg-neon-rose shadow-[0_0_12px_var(--neon-rose)]" />
      <span className="text-muted-foreground">Average match time:</span>
      <span className="font-semibold tabular-nums text-foreground">{seconds}s</span>
    </span>
  );
}

/**
 * Expected number of people online for a given moment: a smooth daily curve
 * (quiet early morning, busy evenings, a small late-night bump) with a
 * slightly busier weekend. Deterministic, so every visitor sees roughly the
 * same figure at the same time and it never jumps between page loads.
 */
export function baselineOnline(date = new Date()): number {
  const h = date.getUTCHours() + 1 + Math.floor(date.getUTCMinutes() / 10) / 6; // ~CET, 10-min steps (SSR-stable)
  const day = date.getUTCDay();
  const evening = Math.exp(-((h - 21) ** 2) / 14); // peak around 21:00
  const midday = 0.45 * Math.exp(-((h - 13) ** 2) / 20); // lunch-break bump
  const lateNight = 0.35 * Math.exp(-(((h + 24 - 25) % 24) ** 2) / 6); // 01:00
  const weekend = day === 0 || day === 6 ? 1.12 : 1;
  return Math.round((160 + 340 * (evening + midday + lateNight)) * weekend);
}

/**
 * Live activity counter: sits on the daily curve and drifts organically by a
 * few people at a time, at irregular intervals, never spiking or freezing.
 */
export function useLiveCounter() {
  const [count, setCount] = useState(() => baselineOnline());
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setCount((c) => {
        const target = baselineOnline();
        const pull = (target - c) * 0.08; // slow mean reversion
        const noise = (Math.random() - 0.5) * 6; // ±3 people of wobble
        const next = Math.round(c + pull + noise);
        return Math.max(40, next);
      });
      timer = window.setTimeout(tick, 3500 + Math.random() * 5000);
    };
    timer = window.setTimeout(tick, 2500);
    return () => window.clearTimeout(timer);
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
      <span className="neon-text font-semibold tabular-nums">{count.toLocaleString("en-US")}</span>
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
  onPick: (mood: MoodId, depth: DepthId) => void;
}) {
  const [mood, setMood] = useState<MoodId | null>(null);

  useEffect(() => {
    if (!open) setMood(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mood ? "How deep do you want to go?" : "How are you feeling right now?"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {mood
            ? "Set the tone of the conversation. You can change it any time by starting a new chat."
            : "Pick a mood so we can tune who you're matched with. It stays private."}
        </p>

        {mood ? (
          <div className="grid gap-3 pt-2">
            {DEPTHS.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  playSfx("click");
                  onPick(mood, d.id);
                }}
                className="neon-glow glass flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm hover:border-primary"
              >
                <span className="text-2xl">{d.emoji}</span>
                <span>
                  <span className="block font-medium">{d.label}</span>
                  <span className="block text-xs text-muted-foreground">{d.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  playSfx("click");
                  setMood(m.id);
                }}
                className="neon-glow glass flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-sm hover:border-primary"
              >
                <span className="text-2xl">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <MatchGuarantee />
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
  partnerName?: string | undefined;
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