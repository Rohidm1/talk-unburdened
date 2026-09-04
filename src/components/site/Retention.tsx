import { useEffect, useState } from "react";
import { CalendarCheck, Flame, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { awardXp, today, useProgress } from "@/lib/gamification";
import { StreakFlame } from "@/components/site/Engagement";
import { playSfx } from "@/lib/sfx";
import { logEngagement } from "@/lib/engagement";

const CHECKIN_KEY = "at.checkin.day";
const MILESTONES = [
  { seconds: 60, xp: 5, label: "1 minute here" },
  { seconds: 180, xp: 10, label: "3 minutes here" },
  { seconds: 420, xp: 20, label: "7 minutes here — you're a regular" },
];
const STREAK_GOALS = [3, 7, 14, 30];

/**
 * Silent session milestones: the longer someone stays, the more XP quietly
 * lands. Runs once per browser session.
 */
export function SessionMilestones() {
  useEffect(() => {
    const started = Date.now();
    const done = new Set<number>(
      JSON.parse(sessionStorage.getItem("at.milestones") ?? "[]") as number[],
    );
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      for (const m of MILESTONES) {
        if (elapsed >= m.seconds && !done.has(m.seconds)) {
          done.add(m.seconds);
          sessionStorage.setItem("at.milestones", JSON.stringify([...done]));
          awardXp(m.xp, `+${m.xp} XP · ${m.label}`);
          logEngagement("session_milestone", { detail: { seconds: m.seconds } });
        }
      }
      if (done.size === MILESTONES.length) window.clearInterval(id);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}

/** Daily check-in card with the streak flame and the next streak goal. */
export function DailyCheckIn({ className = "" }: { className?: string }) {
  const { progress } = useProgress();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(localStorage.getItem(CHECKIN_KEY) === today());
  }, []);

  const nextGoal = STREAK_GOALS.find((g) => g > progress.streak) ?? progress.streak + 30;
  const pct = Math.min(100, Math.round((progress.streak / nextGoal) * 100));

  const checkIn = () => {
    if (checked) return;
    localStorage.setItem(CHECKIN_KEY, today());
    setChecked(true);
    const bonus = 10 + Math.min(progress.streak, 10) * 2;
    awardXp(bonus, `+${bonus} XP · daily check-in`);
    playSfx("xp");
    logEngagement("daily_checkin", { detail: { streak: progress.streak } });
    toast.success(
      progress.streak >= 2
        ? `Day ${progress.streak} in a row. Keep the flame alive tomorrow!`
        : "Checked in. Come back tomorrow to start a streak.",
    );
  };

  return (
    <div className={`glass neon-glow rounded-3xl p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display font-semibold">
          <CalendarCheck className="size-4 text-neon-cyan" /> Daily check-in
        </p>
        <span className="flex items-center gap-1.5 text-sm">
          <StreakFlame streak={progress.streak} />
          <span className="font-semibold tabular-nums">{progress.streak}</span>
          <span className="text-muted-foreground">day streak</span>
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Show up, tap once, earn XP. Longer streaks pay more each day and unlock new chat themes.
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-rose to-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Trophy className="size-3" /> Next reward at {nextGoal} days
        </span>
        <span className="tabular-nums">{progress.xp} XP total</span>
      </div>
      <Button
        className="mt-4 w-full"
        variant={checked ? "outline" : "default"}
        disabled={checked}
        onClick={checkIn}
      >
        <Flame className="size-4" /> {checked ? "Checked in today" : "Check in for today"}
      </Button>
    </div>
  );
}
