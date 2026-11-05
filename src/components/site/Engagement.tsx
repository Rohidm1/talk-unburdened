import { useEffect, useState } from "react";
import { Flame, Gift, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playSfx } from "@/lib/sfx";
import {
  MYSTERY_GOAL_SECONDS,
  chatSecondsToday,
  claimMysteryBox,
  markBonusShown,
  startDoubleXp,
  useProgress,
} from "@/lib/gamification";
import { logEngagement } from "@/lib/engagement";

/** Glowing daily flame that grows with the streak. */
export function StreakFlame({ streak }: { streak: number }) {
  const size = Math.min(1 + streak * 0.12, 2.1);
  return (
    <span className="relative grid place-items-center">
      <Flame
        className="text-neon-rose drop-shadow-[0_0_14px_var(--neon-rose)]"
        style={{ width: `${size}rem`, height: `${size}rem` }}
      />
    </span>
  );
}

/** Locked treasure chest that opens after three minutes of chatting today. */
export function MysteryBox() {
  const { progress } = useProgress();
  const seconds = chatSecondsToday(progress);
  const unlocked = seconds >= MYSTERY_GOAL_SECONDS;
  const claimed = progress.mysteryClaimed === new Date().toISOString().slice(0, 10);
  const pct = Math.min(100, Math.round((seconds / MYSTERY_GOAL_SECONDS) * 100));

  return (
    <div className="glass neon-glow rounded-3xl p-6">
      <p className="flex items-center gap-2 font-display font-semibold">
        <Gift className="size-4 text-neon-cyan" /> Mystery box
      </p>
      <div className="mt-4 grid place-items-center">
        <button
          disabled={!unlocked || claimed}
          onClick={() => {
            if (!claimMysteryBox()) return;
            playSfx("levelup");
            logEngagement("mystery_box_unlocked");
            toast.success("Mystery box opened: +50 XP and today's special badge is yours.");
          }}
          className={`grid size-24 place-items-center rounded-3xl border text-4xl transition-all ${
            unlocked && !claimed
              ? "animate-pulse border-primary bg-primary/10 shadow-[var(--shadow-glow)] hover:scale-105"
              : "border-white/10 bg-white/5 opacity-70"
          }`}
        >
          {claimed ? "🏅" : unlocked ? "🎁" : <Lock className="size-7 text-muted-foreground" />}
        </button>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-neon-cyan/80" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {claimed
          ? "Today's Mystery Theme is unlocked. Come back tomorrow for the next one."
          : unlocked
            ? "Unlocked! Tap the chest to claim today's Mystery Theme."
            : "Chat for at least 3 minutes to unlock today's Mystery Theme / Special Badge."}
      </p>
    </div>
  );
}

/** Once-a-day double-XP offer that expires after 60 seconds. */
export function FirstMatchBonus({ onStart }: { onStart: () => void }) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(60);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (markBonusShown()) setOpen(true);
    }, 6000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLeft(60);
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setOpen(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-strong sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">First match bonus 🎉</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Start a chat in the next{" "}
          <span className="font-semibold tabular-nums text-foreground">{left}s</span> and every XP
          you earn counts double for the next 15 minutes.
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary shadow-[var(--shadow-glow)] transition-all duration-1000 ease-linear"
            style={{ width: `${(left / 60) * 100}%` }}
          />
        </div>
        <Button
          className="mt-3 neon-glow"
          onClick={() => {
            startDoubleXp(15);
            playSfx("levelup");
            logEngagement("bonus_claimed");
            setOpen(false);
            onStart();
          }}
        >
          Claim Double XP Boost
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          No thanks
        </Button>
      </DialogContent>
    </Dialog>
  );
}