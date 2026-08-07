import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { chatHeartbeat, listChatMessages, sendChatMessage } from "@/lib/chat.functions";
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

  const [answered, setAnswered] = useState(false);
  const [remaining, setRemaining] = useState(allowance);
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
    setRemaining(allowance);
  }, [sessionId, open, allowance]);

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
  }, [messages.data?.length]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || !sessionId || sending) return;
    setSending(true);
    setDraft("");
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
    } catch {
      setDraft(body);
      toast.error("Your message could not be sent. Please try again.");
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
              {mode === "free" ? "Gratis berichten" : "Resterende credits"}: {remaining}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {!answered ? (
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/40 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {listener?.displayName} hasn't joined yet — you can already send your message and it
              will be waiting for them.
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
          <Button size="icon" disabled={sending || !draft.trim() || remaining <= 0} onClick={() => void submit()}>
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
