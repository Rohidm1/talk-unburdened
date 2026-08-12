import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playSfx } from "@/lib/sfx";
import { awardXp, completeQuest } from "@/lib/gamification";
import { logEngagement } from "@/lib/engagement";

const TOKENS = [
  { id: "heart", emoji: "💜", label: "Thank you" },
  { id: "listener", emoji: "🎧", label: "Great listener" },
  { id: "kind", emoji: "🌟", label: "So kind" },
  { id: "safe", emoji: "🛡️", label: "Made me feel safe" },
];

/** Anonymous post-chat gratitude token. */
export function ComplimentDialog({
  open,
  partnerName,
  onClose,
}: {
  open: boolean;
  partnerName: string;
  onClose: () => void;
}) {
  const [sent, setSent] = useState<string | null>(null);

  const send = (id: string, label: string) => {
    setSent(id);
    playSfx("match");
    completeQuest("compliment");
    awardXp(10, "+10 XP · kindness");
    logEngagement("compliment_sent", { detail: { token: id, label } });
    toast.success(`Your badge was sent anonymously to ${partnerName}.`);
    window.setTimeout(() => {
      setSent(null);
      onClose();
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Send {partnerName} a token?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Completely anonymous. It just tells them the conversation mattered.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {TOKENS.map((t) => (
            <button
              key={t.id}
              onClick={() => send(t.id, t.label)}
              className={`neon-glow glass flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 text-sm hover:border-primary ${
                sent === t.id ? "pop-once border-primary" : ""
              }`}
            >
              <span className="text-2xl">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" className="mt-2" onClick={onClose}>
          Maybe later
        </Button>
      </DialogContent>
    </Dialog>
  );
}