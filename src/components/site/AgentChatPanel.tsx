import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Bell,
  BellOff,
  ChevronDown,
  ChevronRight,
  History,
  Inbox,
  MessageCircle,
  SendHorizonal,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  acceptChat,
  closeChatAsAgent,
  declineChat,
  getChatClientStats,
  listChatEvents,
  listChatMessages,
  listMyChats,
  sendChatMessage,
} from "@/lib/chat.functions";
import { useInboxAlert } from "@/hooks/useInboxAlert";

function duration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} u ${m} min` : `${m} min`;
}

const eventLabels: Record<string, string> = {
  request_received: "Nieuwe aanvraag ontvangen",
  accepted: "Aanvraag geaccepteerd door agent",
  declined: "Aanvraag geweigerd",
  expired: "Aanvraag verlopen",
  connected: "Verbonden",
  interrupted: "Netwerkonderbreking",
  reconnected: "Opnieuw verbonden",
  ended: "Beëindigd",
};

export function AgentChatPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const fetchChats = useServerFn(listMyChats);
  const fetchMessages = useServerFn(listChatMessages);
  const fetchEvents = useServerFn(listChatEvents);
  const fetchStats = useServerFn(getChatClientStats);
  const send = useServerFn(sendChatMessage);
  const take = useServerFn(acceptChat);
  const refuse = useServerFn(declineChat);
  const close = useServerFn(closeChatAsAgent);

  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closedIds, setClosedIds] = useState<string[]>([]);
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

  const events = useQuery({
    queryKey: ["chat-events", openId],
    queryFn: () => fetchEvents({ data: { sessionId: openId! } }),
    enabled: !!openId && showAudit,
    refetchInterval: 10000,
  });

  const stats = useQuery({
    queryKey: ["chat-stats", openId],
    queryFn: () => fetchStats({ data: { sessionId: openId! } }),
    enabled: !!openId && showStats,
    refetchInterval: 30000,
  });

  const rows = (chats.data ?? []).filter((c) => !closedIds.includes(c.id));
  const pending = rows.filter((c) => c.status !== "active");
  const activeChats = rows.filter((c) => c.status === "active");
  const current = activeChats.find((c) => c.id === openId) ?? null;
  const alert = useInboxAlert(pending.length);

  useEffect(() => {
    if (openId && !activeChats.some((c) => c.id === openId)) setOpenId(null);
  }, [activeChats, openId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["agent-chats"] });

  /** Ends the conversation and releases the fictional profile straight away. */
  const closeSession = async (sessionId: string) => {
    if (closingId) return;
    setClosingId(sessionId);
    // Free the slot in the UI immediately; the server call confirms right after.
    setClosedIds((ids) => [...ids, sessionId]);
    if (openId === sessionId) setOpenId(null);
    try {
      await close({ data: { sessionId } });
      toast.success("Chat afgesloten — je profiel is weer beschikbaar.");
    } catch {
      setClosedIds((ids) => ids.filter((id) => id !== sessionId));
      toast.error("Afsluiten mislukt. Probeer het opnieuw.");
    } finally {
      setClosingId(null);
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["agent-listeners"] });
    }
  };

  const submit = async () => {
    const body = draft.trim();
    if (!body || !openId) return;
    setDraft("");
    await send({ data: { sessionId: openId, body } });
    await messages.refetch();
  };

  if (!enabled) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Message requests: a quiet inbox, never a ringing call. */}
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Inbox className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Berichtverzoeken</h2>
          {pending.length > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
              {pending.length}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {alert.soundOn ? (
              <Bell className="size-4 text-primary" />
            ) : (
              <BellOff className="size-4 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">Geluid</span>
            <Switch
              checked={alert.soundOn}
              onCheckedChange={(next) => alert.toggleSound(next)}
              aria-label="Meldingsgeluid"
            />
          </div>
        </div>
        {alert.soundOn && alert.permission !== "granted" ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3">
            <span className="flex-1 text-xs text-muted-foreground">
              Geef eenmalig toestemming voor geluid en meldingen, dan hoor je nieuwe verzoeken ook
              met dit tabblad op de achtergrond.
            </span>
            <Button size="sm" variant="outline" onClick={() => void alert.enableSound()}>
              Geluid activeren
            </Button>
          </div>
        ) : null}
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Geen openstaande berichtverzoeken. Nieuwe verzoeken verschijnen hier vanzelf.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {pending.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-primary/30 bg-secondary/30 p-4"
              >
                <div className="flex items-center gap-2">
                  <UserRound className="size-4 text-primary" />
                  <span className="font-semibold">{c.clientAlias}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(c.startedAt).toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Wil chatten met <span className="font-medium text-foreground">{c.profileName}</span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await take({ data: { sessionId: c.id } });
                      setOpenId(c.id);
                      refresh();
                      toast.success("Berichtverzoek geaccepteerd.");
                    }}
                  >
                    Verzoek accepteren
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Live chats</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {activeChats.length} actief
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,240px)_1fr]">
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {activeChats.length === 0 ? (
            <li className="text-sm text-muted-foreground">Geen lopende chats.</li>
          ) : (
            activeChats.map((c) => (
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
                >
                  <span className="font-semibold">{c.clientAlias}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={`size-2 rounded-full ${
                        c.clientAway ? "bg-muted-foreground" : "animate-pulse bg-emerald-500"
                      }`}
                    />
                    als {c.profileName} · {c.clientAway ? "klant offline" : "verbonden"}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant={c.clientAway ? "destructive" : "outline"}
                  className="mt-2 w-full"
                  disabled={closingId === c.id}
                  onClick={() => void closeSession(c.id)}
                >
                  <X className="size-4" /> Chat afsluiten
                </Button>
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
                  <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    <span
                      className={`size-2 rounded-full ${
                        current.clientAway
                          ? "bg-muted-foreground"
                          : "animate-pulse bg-emerald-500"
                      }`}
                    />
                    {current.clientAway ? "klant heeft de chat verlaten" : "live verbonden"}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={closingId === current.id}
                  onClick={() => void closeSession(current.id)}
                >
                  <X className="size-4" /> Chat afsluiten
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

              <div className="border-t border-border">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
                  onClick={() => setShowStats((v) => !v)}
                >
                  {showStats ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  <BarChart3 className="size-4 text-primary" /> Klantstatistieken
                </button>
                {showStats ? (
                  <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Totale gespreksduur</dt>
                      <dd className="font-semibold">
                        {duration(stats.data?.totalSeconds ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Sessies (chat / bel)</dt>
                      <dd className="font-semibold">
                        {stats.data?.chatCount ?? 0} / {stats.data?.callCount ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Lid sinds</dt>
                      <dd className="font-semibold">
                        {stats.data?.since
                          ? new Date(stats.data.since).toLocaleDateString("nl-NL")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Berichten ontvangen</dt>
                      <dd className="font-semibold">{stats.data?.messagesFromClient ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Berichten verstuurd</dt>
                      <dd className="font-semibold">{stats.data?.messagesFromAgent ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Gem. responstijd</dt>
                      <dd className="font-semibold">
                        {stats.data?.avgAgentReplySeconds != null
                          ? `jij ${stats.data.avgAgentReplySeconds}s`
                          : "jij —"}
                        {" · "}
                        {stats.data?.avgClientReplySeconds != null
                          ? `klant ${stats.data.avgClientReplySeconds}s`
                          : "klant —"}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </div>

              <div className="border-t border-border">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
                  onClick={() => setShowAudit((v) => !v)}
                >
                  {showAudit ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  <History className="size-4 text-primary" /> Audit log
                </button>
                {showAudit ? (
                  <ol className="max-h-48 space-y-2 overflow-y-auto px-4 pb-4 text-sm">
                    {(events.data ?? []).length === 0 ? (
                      <li className="text-muted-foreground">Nog geen gebeurtenissen.</li>
                    ) : (
                      (events.data ?? []).map((e) => (
                        <li key={e.id} className="flex gap-3">
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {new Date(e.created_at).toLocaleTimeString("nl-NL", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span>
                            {eventLabels[e.event] ?? e.detail ?? e.event}
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({e.actor_role})
                            </span>
                          </span>
                        </li>
                      ))
                    )}
                  </ol>
                ) : null}
              </div>
            </>
          ) : (
            <p className="m-auto p-6 text-sm text-muted-foreground">
              Accepteer een berichtverzoek of kies een lopende chat om te antwoorden.
            </p>
          )}
        </div>
      </div>
      </section>
    </div>
  );
}
