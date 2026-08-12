import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dices, SendHorizonal, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { chatHeartbeat, listChatMessages, sendChatMessage } from "@/lib/chat.functions";
import { persistAiMessage, requestAiReply } from "@/lib/ai-fallback.functions";
import { typingDelayMs } from "@/lib/ai-persona";
import { rollIcebreaker } from "@/lib/icebreakers";
import { isMuted, playSfx, setMuted } from "@/lib/sfx";
import { awardXp, completeQuest } from "@/lib/gamification";
import type { Listener } from "@/data/listeners";

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
  const askAi = useServerFn(requestAiReply);
  const saveAi = useServerFn(persistAiMessage);

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
  const turnRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const open = !!listener && !!sessionId;
  const partnerName = listener?.displayName ?? "your chat partner";

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const messages = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => fetchMessages({ data: { sessionId: sessionId! } }),
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
        else if (status.shouldEnd) onEnd("out_of_credit");
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

  // A soft chime whenever the partner's reply lands.
  const lastCount = useRef(0);
  useEffect(() => {
    const list = messages.data ?? [];
    if (list.length > lastCount.current && lastCount.current > 0) {
      const last = list[list.length - 1];
      if (last && last.sender_role !== "client") playSfx("receive");
    }
    lastCount.current = list.length;
  }, [messages.data]);

  // A human agent joining cancels any pending stand-in reply.
  useEffect(() => {
    if (answered) {
      turnRef.current += 1;
      setPartnerTyping(false);
    }
  }, [answered]);

  const runFallbackTurn = async (kind: "reply" | "opener" = "reply") => {
    if (!sessionId) return;
    turnRef.current += 1;
    const turn = turnRef.current;
    const stillMine = () => turn === turnRef.current;
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

    setPartnerTyping(true);
    try {
      const result = await askAi({ data: { sessionId, kind } });
      if (!stillMine()) return;
      if (!result.ok) {
        setPartnerTyping(false);
        if (result.reason === "unavailable" || result.reason === "rate_limited") {
          setNotice(
            "Thanks for your patience! We're reviewing your message and will reply in a moment.",
          );
        }
        return;
      }

      for (let i = 0; i < result.chunks.length; i += 1) {
        const chunk = result.chunks[i]!;
        if (i > 0) setPartnerTyping(true);
        // longer messages visibly take longer to "type"
        await wait(typingDelayMs(chunk));
        if (!stillMine()) return;
        const saved = await saveAi({ data: { sessionId, body: chunk } });
        if (!stillMine()) return;
        if (!saved.ok) break;
        setPartnerTyping(false);
        await messages.refetch();
        if (i < result.chunks.length - 1) await wait(600);
        if (!stillMine()) return;
      }
    } catch {
      if (stillMine()) {
        setNotice(
          "Thanks for your patience! We're reviewing your message and will reply in a moment.",
        );
      }
    } finally {
      if (stillMine()) setPartnerTyping(false);
    }
  };

  // Proactive icebreaker when the person hasn't typed within 8 seconds.
  useEffect(() => {
    if (!open || !sessionId || userSpoke || answered) return;
    const id = window.setTimeout(() => {
      if (!userSpoke) void runFallbackTurn("opener");
    }, 8000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId, userSpoke, answered]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || !sessionId || sending) return;
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
          onEnd("out_of_credit");
        } else if (result.reason === "closed") {
          toast.error("This chat has ended.");
          onEnd("closed");
        } else {
          toast.error("Your message could not be sent. Please try again.");
        }
        return;
      }
      await messages.refetch();
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
      if (!answered) void runFallbackTurn("reply");
    } catch {
      setDraft(body);
      toast.error("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onEnd("user")}>
      <DialogContent className="glass-strong flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center justify-between gap-3 font-display">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full ${
                  connected
                    ? "bg-emerald-400 shadow-[0_0_12px_#34d399]"
                    : "animate-pulse bg-amber-400 shadow-[0_0_12px_#fbbf24]"
                }`}
              />
              <span className="flex flex-col">
                <span>{partnerName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {connected
                    ? `Connected with ${partnerName}`
                    : `Connecting with ${partnerName}...`}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2">
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

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
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
      </DialogContent>
    </Dialog>
  );
}
