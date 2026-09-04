import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { useLiveCounter } from "@/components/site/MatchFlow";
import { playSfx } from "@/lib/sfx";
import { logEngagement } from "@/lib/engagement";

/**
 * One-click chat trigger that floats on every major page. On the homepage it
 * starts a chat directly; elsewhere it jumps home with `?chat=1`, which the
 * homepage picks up and opens the chat flow automatically.
 */
export function FloatingChat({ onStart }: { onStart?: () => void }) {
  const navigate = useNavigate();
  const online = useLiveCounter();
  const [show, setShow] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const a = window.setTimeout(() => setShow(true), 1200);
    const b = window.setTimeout(() => {
      if (sessionStorage.getItem("at.fab.bubble") !== "1") setBubble(true);
    }, 9000);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  const closeBubble = () => {
    setBubble(false);
    sessionStorage.setItem("at.fab.bubble", "1");
  };

  const start = () => {
    playSfx("click");
    logEngagement("fab_clicked", { detail: { path: window.location.pathname } });
    closeBubble();
    if (onStart) onStart();
    else void navigate({ to: "/", search: { chat: 1 } });
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 transition-all duration-500 sm:right-6 sm:bottom-6 ${
        show ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {bubble ? (
        <div className="glass-strong relative max-w-[240px] rounded-2xl p-4 text-sm shadow-[var(--shadow-glow)]">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={closeBubble}
            className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <X className="size-3" />
          </button>
          <p className="font-medium">Someone's free to chat right now.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your first 5 messages are on us. No name, no card.
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Hide chat button"
          onClick={() => setDismissed(true)}
          className="grid size-7 place-items-center rounded-full border border-border bg-card/80 text-muted-foreground opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
        >
          <X className="size-3" />
        </button>
        <button
          type="button"
          onClick={start}
          className="glow-cta group flex items-center gap-3 rounded-full bg-primary py-3 pr-5 pl-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03] active:scale-95"
        >
          <span className="relative grid size-8 place-items-center rounded-full bg-primary-foreground/15">
            <MessageCircle className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-neon-cyan shadow-[0_0_10px_var(--neon-cyan)]" />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>Start chatting free</span>
            <span className="text-[11px] font-normal opacity-80 tabular-nums">
              {online.toLocaleString("en-US")} online now
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
