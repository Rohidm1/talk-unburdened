import { Check, Flame, Lock, Palette, Zap } from "lucide-react";
import { QUESTS, THEMES, setTheme, useProgress } from "@/lib/gamification";
import { playSfx } from "@/lib/sfx";
import { Progress as Bar } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** Level, XP, streak, daily quests and theme unlocks. */
export function ProgressWidget() {
  const { progress, level, into, need, pct, isQuestDone } = useProgress();

  return (
    <section id="progress" className="mx-auto max-w-6xl px-5 py-10">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass neon-glow rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Anontalk level</p>
              <p className="font-display text-4xl font-semibold text-primary">{level}</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-neon-rose/40 bg-black/40 px-3 py-1 text-sm">
              <Flame className="size-4 text-neon-rose" />
              <span className="font-semibold tabular-nums">{progress.streak}</span>
              <span className="text-muted-foreground">day streak</span>
            </span>
          </div>
          <Bar value={pct} className="mt-5 h-2.5 bg-white/10" />
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            {into} / {need} XP to level {level + 1} · {progress.xp} XP total
          </p>
        </div>

        <div className="glass rounded-3xl p-6">
          <p className="flex items-center gap-2 font-display font-semibold">
            <Zap className="size-4 text-neon-cyan" /> Daily quests
          </p>
          <ul className="mt-4 space-y-2.5">
            {QUESTS.map((q) => {
              const done = isQuestDone(q.id);
              return (
                <li key={q.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`grid size-5 place-items-center rounded-md border ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    {done ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className={done ? "text-muted-foreground line-through" : ""}>{q.label}</span>
                  <span className="ml-auto text-xs text-neon-cyan">+{q.xp}</span>
                </li>
              );
            })}
          </ul>
          <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
            <Link to="/hub">Open the Mental Health Hub</Link>
          </Button>
        </div>

        <div className="glass rounded-3xl p-6">
          <p className="flex items-center gap-2 font-display font-semibold">
            <Palette className="size-4 text-neon-rose" /> Theme unlocks
          </p>
          <div className="mt-4 space-y-2.5">
            {THEMES.map((th) => {
              const unlocked = level >= th.level;
              const active = progress.theme === th.id;
              return (
                <button
                  key={th.id}
                  disabled={!unlocked}
                  onClick={() => {
                    playSfx("click");
                    setTheme(th.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
                      : "border-white/10 bg-white/5"
                  } ${unlocked ? "hover:border-primary/60" : "cursor-not-allowed opacity-55"}`}
                >
                  {unlocked ? null : <Lock className="size-3.5" />}
                  <span>{th.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {unlocked ? (active ? "Active" : "Activate") : `Level ${th.level}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}