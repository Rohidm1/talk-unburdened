import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chatHeartbeat, listChatMessages, sendChatMessage } from "@/lib/chat.functions";
import type { Listener } from "@/data/listeners";

function clock(seconds: number) {
  const m = Math.floor(Math.max(seconds, 0) / 60);
  const s = Math.max(seconds, 0) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChatDialog({
  listener,
  sessionId,
  mode,
  allowanceSeconds,
  onEnd,
}: {
  listener: Listener | null;
  sessionId: string | null;
  mode: "paid" | "free";
  allowanceSeconds: number;
  onEnd: (reason: "user" | "out_of_credit" | "closed") => void;
}) {
  const beat = useServerFn(chatHeartbeat);
  const send = useServerFn(sendChatMessage);
  const fetchMessages = useServerFn(listChatMessages);

  const [answered, setAnswered] = useState(false);
  const [remaining, setRemaining] = useState(allowanceSeconds);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const open = !!listener && !!sessionId;

  const messages = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => fetchMessages({ data: { sessionId: sessionId! } }),
    enabled: open,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!open) return;
    setAnswered(false);
    setRemaining(allowanceSeconds);
  }, [sessionId, open, allowanceSeconds]);

  // The server owns the clock: it decides when the credit runs out.
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

  // Local countdown between heartbeats so the timer feels live.
  useEffect(() => {
    if (!open || !answered) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(r - 1, 0)), 1000);
    return () => window.clearInterval(id);
  }, [open, answered]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || !sessionId || sending) return;
    setSending(true);
    setDraft("");
    try {
      await send({ data: { sessionId, body } });
      await messages.refetch();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onEnd("user")}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center justify-between gap-3 font-display">
            <span>{listener?.displayName ?? "Chat"}</span>
            <span className="text-sm font-normal tabular-nums text-muted-foreground">
              {mode === "free" ? "Gratis minuten" : "Resterend"} {clock(remaining)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {!answered ? (
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/40 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              We verbinden je met {listener?.displayName}. Er wordt nog niets afgeschreven.
            </div>
          ) : null}

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
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <Input
            value={draft}
            maxLength={2000}
            disabled={!answered}
            placeholder={answered ? "Typ je bericht…" : "Even geduld…"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button size="icon" disabled={!answered || !draft.trim()} onClick={() => void submit()}>
            <SendHorizonal className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => onEnd("user")}>
            Stop
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
