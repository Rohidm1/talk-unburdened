import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  acceptChat,
  closeChatAsAgent,
  declineChat,
  listChatMessages,
  listMyChats,
  sendChatMessage,
} from "@/lib/chat.functions";

export function AgentChatPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const fetchChats = useServerFn(listMyChats);
  const fetchMessages = useServerFn(listChatMessages);
  const send = useServerFn(sendChatMessage);
  const take = useServerFn(acceptChat);
  const refuse = useServerFn(declineChat);
  const close = useServerFn(closeChatAsAgent);

  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const chats = useQuery({
    queryKey: ["agent-chats"],
    queryFn: () => fetchChats(),
    enabled,
    refetchInterval: 3000,
  });

  const messages = useQuery({
    queryKey: ["chat-messages", openId],
    queryFn: () => fetchMessages({ data: { sessionId: openId! } }),
    enabled: !!openId,
    refetchInterval: 2000,
  });

  const rows = chats.data ?? [];
  const current = rows.find((c) => c.id === openId) ?? null;

  useEffect(() => {
    if (openId && !rows.some((c) => c.id === openId)) setOpenId(null);
  }, [rows, openId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["agent-chats"] });

  const submit = async () => {
    const body = draft.trim();
    if (!body || !openId) return;
    setDraft("");
    await send({ data: { sessionId: openId, body } });
    await messages.refetch();
  };

  if (!enabled) return null;

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Live chats</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.filter((c) => c.status === "active").length} actief
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,240px)_1fr]">
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {rows.length === 0 ? (
            <li className="text-sm text-muted-foreground">Geen chats op dit moment.</li>
          ) : (
            rows.map((c) => (
              <li
                key={c.id}
                className={`rounded-2xl border p-3 text-sm ${
                  openId === c.id ? "border-primary/50 bg-secondary/50" : "border-border"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setOpenId(c.id)}
                  disabled={c.status !== "active"}
                >
                  <span className="font-semibold">{c.clientAlias}</span>
                  <span className="block text-xs text-muted-foreground">
                    als {c.profileName} · {c.status === "active" ? "actief" : "nieuwe aanvraag"}
                  </span>
                </button>
                {c.status !== "active" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await take({ data: { sessionId: c.id } });
                        setOpenId(c.id);
                        refresh();
                      }}
                    >
                      Aannemen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await refuse({ data: { sessionId: c.id } });
                        refresh();
                      }}
                    >
                      Weigeren
                    </Button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>

        <div className="flex min-h-64 flex-col rounded-2xl border border-border bg-secondary/20">
          {current ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
                <span className="font-semibold">
                  {current.clientAlias}
                  <span className="ml-2 font-normal text-muted-foreground">
                    als {current.profileName}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    await close({ data: { sessionId: current.id } });
                    setOpenId(null);
                    refresh();
                    toast.success("Chat afgerond.");
                  }}
                >
                  Afronden
                </Button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {(messages.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.sender_role === "agent"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-card"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <Input
                  value={draft}
                  maxLength={2000}
                  placeholder="Typ je antwoord…"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                <Button size="icon" disabled={!draft.trim()} onClick={() => void submit()}>
                  <SendHorizonal className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <p className="m-auto p-6 text-sm text-muted-foreground">
              Kies een chat om te antwoorden.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
