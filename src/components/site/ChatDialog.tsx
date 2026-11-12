import { useEffect, useRef, useState } from "react";
import { alertUser } from "@/lib/native";
import { confirmSafeToSend } from "@/lib/safety";
import { openReport } from "@/components/site/ReportDialog";
import { markSeen } from "@/hooks/useBadges";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Flag, Dices, SendHorizonal, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { chatHeartbeat, listChatMessages, sendChatMessage } from "@/lib/chat.functions";
import { rollIcebreaker } from "@/lib/icebreakers";
import { isMuted, playSfx, setMuted } from "@/lib/sfx";
import { addChatSeconds, awardXp, completeQuest } from "@/lib/gamification";
import { logEngagement } from "@/lib/engagement";
import type { Listener } from "@/data/listeners";
import { TopUpDialog } from "@/components/site/TopUpDialog";

export function ChatDialog({
  listener,
  sessionId,
  mode,
  allowance,
  onEnd,
}: {
  listener: Listener | null;
  sessionId: string | null;
  mode: "paid" | "free";
  allowance: number;
  onEnd: (reason: "user" | "out_of_credit" | "closed") => void;
}) {
  const beat = useServerFn(chatHeartbeat);
  const send = useServerFn(sendChatMessage);
  const fetchMessages = useServerFn(listChatMessages);

  const [answered, setAnswered] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userSpoke, setUserSpoke] = useState(false);
  const [remaining, setRemaining] = useState(allowance);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [sent, setSent] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const exhausted = useRef(false);
  const turnRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const open = !!listener && !!sessionId;
  const partnerName = listener?.displayName ?? "your chat partner";

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const messages = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => sessionId ? fetchMessages({ data: { sessionId } }) : Promise.resolve([]),
    enabled: open,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!open) return;
    setAnswered(false);
    setRemaining(allowance);
    setPartnerTyping(false);
    setNotice(null);
    setConnected(false);
    setUserSpoke(false);
    exhausted.current = false;
    setPaywall(false);
    turnRef.current += 1;
  }, [sessionId, open, allowance]);

  // Phase 1 → Phase 2: a short, natural connecting beat before the chat opens up.
  useEffect(() => {
    if (!open) return;
    const delay = 1500 + Math.random() * 1500;
    const id = window.setTimeout(() => setConnected(true), delay);
    return () => window.clearTimeout(id);
  }, [open, sessionId]);

  useEffect(() => {
    if (!open || !sessionId) return;
    let stop = false;
    const tick = async () => {
      try {
        const status = await beat({ data: { sessionId } });
        if (stop) return;
        setAnswered(status.answered);
        setRemaining(status.remaining);
        if (status.status === "missing" || status.status === "ended") onEnd("closed");
        else if (status.shouldEnd && !exhausted.current) { exhausted.current = true; setPaywall(true); }
      } catch {
        /* a dropped beat is retried on the next interval */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 10000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [open, sessionId, beat, onEnd]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length, partnerTyping]);

  // Time spent chatting today feeds the mystery box progress.
  useEffect(() => {
    if (open) markSeen("chat");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => addChatSeconds(15), 15000);
    return () => window.clearInterval(id);
  }, [open]);

  // A soft chime whenever the partner's reply lands.
  const lastCount = useRef(0);
  useEffect(() => {
    const list = messages.data ?? [];
    if (list.length > lastCount.current && lastCount.current > 0) {
      const last = list[list.length - 1];
      if (last && last.sender_role !== "client") {
        setNotice(null);
        alertUser({ title: "New message", body: "Your chat partner replied.", url: "/?chat=1", tag: "chat", kind: "chat" });
        markSeen("chat");
      }
    }
    lastCount.current = list.length;
  }, [messages.data]);

  // Replies come only from the team; clear the typing hint once someone answers.
  useEffect(() => {
    if (answered) {
      turnRef.current += 1;
      setPartnerTyping(false);
    }
  }, [answered]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || !sessionId || sending || remaining <= 0) return;
    if (!(await confirmSafeToSend(body))) return;
    setSending(true);
    setDraft("");
    setUserSpoke(true);
    playSfx("send");
    try {
      const result = await send({ data: { sessionId, body } });
      if (!result.ok) {
        setDraft(body);
        if (result.reason === "no_credit") {
          toast.error("You're out of credits. Top up to keep chatting.");
          setRemaining(0);
          exhausted.current = true;
          setPaywall(true);
        } else if (result.reason === "closed") {
          toast.error("This chat has ended.");
          onEnd("closed");
        } else {
          toast.error("Your message could not be sent. Please try again.");
        }
        return;
      }
      await messages.refetch();
      if (typeof result.remaining === "number") {
        setRemaining(result.remaining);
        if (result.remaining <= 0) { exhausted.current = true; setPaywall(true); }
      }
      setNotice(null);
      setSent((n) => {
        const next = n + 1;
        if (next === 5) {
          completeQuest("chat5");
          awardXp(25, "+25 XP · quest complete");
        } else {
          awardXp(5, "+5 XP");
        }
        return next;
      });
      if (!answered) setNotice(`${partnerName} will reply as soon as possible.`);
    } catch {
      setDraft(body);
      toast.error("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onEnd("user")}>
      <DialogContent className="fixed inset-0 left-0 top-0 z-50 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:max-w-none [&>button.absolute]:hidden">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-background/90 px-2 py-2 backdrop-blur">
          <DialogTitle className="flex items-center justify-between gap-2 font-display">
            <span className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label="Back to chat partners"
                onClick={() => onEnd("user")}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition active:scale-90 hover:bg-secondary"
              >
                <ArrowLeft className="size-5" />
              </button>
              <span className="relative shrink-0">
                {listener?.avatar ? (
                  <img src={listener.avatar} alt={partnerName} width={40} height={40} className="size-10 rounded-full object-cover" />
                ) : (
                  <span className="block size-10 rounded-full bg-secondary" />
                )}
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-background ${connected ? "bg-success" : "animate-pulse bg-primary"}`}
                />
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-base">{partnerName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {connected ? "Online" : "Connecting…"}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              {sessionId ? (
                <button
                  type="button"
                  aria-label="Report this conversation"
                  onClick={() => openReport({ type: "chat", id: sessionId, canBlock: false })}
                  className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Flag className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                aria-label={muted ? "Unmute sounds" : "Mute sounds"}
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  setMutedState(next);
                  if (!next) playSfx("click");
                }}
                className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <span className="text-sm font-normal tabular-nums text-muted-foreground">
                {mode === "free" ? "Free messages" : "Credits left"}: {remaining}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>
        <p role="note" className="border-b border-border bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
          {listener?.displayName ?? "This chat partner"} is a profile run by the Anontalk team. Every reply is written by a team member.
        </p>

        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {(messages.data ?? []).map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.sender_role === "client"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.body}
            </div>
          ))}

          {partnerTyping ? (
            <div className="flex w-fit items-center gap-1 rounded-2xl bg-secondary px-4 py-3">
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">{partnerName} is typing…</span>
            </div>
          ) : null}

          {notice ? (
            <p className="rounded-2xl bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
              {notice}
            </p>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <Button
            size="icon"
            variant="outline"
            aria-label="Roll an icebreaker"
            title="Roll an icebreaker"
            className="neon-glow shrink-0"
            onClick={() => {
              playSfx("dice");
              setDraft((d) => rollIcebreaker(d));
              completeQuest("icebreaker");
              awardXp(10, "+10 XP · icebreaker");
              logEngagement("icebreaker_dice", { sessionId });
            }}
          >
            <Dices className="size-4" />
          </Button>
          <Input
            value={draft}
            maxLength={2000}
            disabled={sending || remaining <= 0}
            placeholder={remaining <= 0 ? "Out of credits" : "Type your message…"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button
            size="icon"
            disabled={sending || !draft.trim() || remaining <= 0}
            onClick={() => void submit()}
          >
            <SendHorizonal className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => onEnd("user")}>
            End
          </Button>
        </div>
        {remaining <= 0 ? <Button variant="outline" className="m-4 mt-0" onClick={() => setPaywall(true)}>Buy credits to continue</Button> : null}
      </DialogContent>
    </Dialog>
    <TopUpDialog open={paywall} partnerName={listener?.displayName} reason={mode === "free" ? "free_used" : "no_credit"} onClose={() => setPaywall(false)} onPurchased={() => {
      if (!sessionId) return;
      void beat({ data: { sessionId } }).then((status) => { setRemaining(status.remaining); exhausted.current = status.remaining <= 0; });
    }} />
    </>
  );
}
