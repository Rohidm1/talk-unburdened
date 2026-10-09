import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Send, X } from "lucide-react";
import { askSupport } from "@/lib/support.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function SupportWidget() {
  const ask = useServerFn(askSupport);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! Questions about credits, privacy or a complaint? I'm here to help." },
  ]);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const r = await ask({
        data: { messages: next.slice(1).slice(-20), email: email.includes("@") ? email : undefined },
      });
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: r.ok
            ? r.reply + (r.escalated ? "\n\n✓ I've forwarded this to our team." : "")
            : r.error,
        },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open support"
        className="fixed bottom-5 left-5 z-40 flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg backdrop-blur-xl"
      >
        <LifeBuoy className="size-5 text-primary" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 z-50 flex h-[28rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col rounded-3xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-semibold">Anontalk support</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close support">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {msgs.map((m, i) => (
          <p
            key={i}
            className={
              m.role === "user"
                ? "ml-8 whitespace-pre-wrap rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                : "mr-8 whitespace-pre-wrap text-foreground"
            }
          >
            {m.content}
          </p>
        ))}
        {busy ? <p className="text-muted-foreground">Typing…</p> : null}
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional, so we can reply)"
          className="w-full rounded-xl border border-input bg-background/50 px-3 py-1.5 text-xs"
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="Type your question…"
            className="flex-1 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            aria-label="Send"
            className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
