import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { playSfx } from "@/lib/sfx";
import { awardXp } from "@/lib/gamification";
import { logEngagement } from "@/lib/engagement";

const QUESTIONS = [
  { q: "Would you rather…", a: "Talk all night", b: "Sit in comfy silence" },
  { q: "Would you rather…", a: "Fix the problem", b: "Just be heard" },
  { q: "Would you rather…", a: "Late-night walk", b: "Blanket and a film" },
  { q: "Would you rather…", a: "Say it messy", b: "Write it out first" },
  { q: "Would you rather…", a: "Laugh about it", b: "Cry it out" },
  { q: "Would you rather…", a: "Coffee at sunrise", b: "Wine at midnight" },
];

/** 30-second co-op icebreaker that runs before the text input opens. */
export function IcebreakerQuiz({
  open,
  partnerName,
  onDone,
}: {
  open: boolean;
  partnerName: string;
  onDone: (answer: string | null) => void;
}) {
  const [left, setLeft] = useState(30);
  const [picked, setPicked] = useState<string | null>(null);
  const question = useMemo(() => QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]!, [open]);

  useEffect(() => {
    if (!open) return;
    setLeft(30);
    setPicked(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          onDone(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (answer: string) => {
    setPicked(answer);
    playSfx("match");
    awardXp(10, "+10 XP · icebreaker quiz");
    logEngagement("quiz_answered", { detail: { answer } });
    window.setTimeout(() => onDone(answer), 700);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDone(null)}>
      <DialogContent className="glass-strong sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-display">
            Quick icebreaker with {partnerName}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {question.q} Pick one — {partnerName} answers too. {left}s left.
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary shadow-[var(--shadow-glow)] transition-all duration-1000 ease-linear"
            style={{ width: `${(left / 30) * 100}%` }}
          />
        </div>
        <div className="grid gap-3 pt-3 sm:grid-cols-2">
          {[question.a, question.b].map((option) => (
            <button
              key={option}
              onClick={() => choose(option)}
              className={`neon-glow glass rounded-2xl px-4 py-6 text-sm hover:border-primary ${
                picked === option ? "pop-once border-primary" : ""
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-1" onClick={() => onDone(null)}>
          Skip to the chat
        </Button>
      </DialogContent>
    </Dialog>
  );
}