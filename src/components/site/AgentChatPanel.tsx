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
  NotebookPen,
  SendHorizonal,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  acceptChat,
  closeChatAsAgent,
  declineChat,
  getChatHandoff,
  getChatClientStats,
  listChatEvents,
  listChatMessages,
  listChatNotes,
  listMyChats,
  saveChatNote,
  sendChatMessage,
} from "@/lib/chat.functions";
import { useInboxAlert } from "@/hooks/useInboxAlert";

function duration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

const eventLabels: Record<string, string> = {
  request_received: "New request received",
  accepted: "Request accepted by agent",
  declined: "Request declined",
  expired: "Request expired",
  connected: "Connected",
  interrupted: "Network interruption",
  reconnected: "Reconnected",
  ended: "Ended",
  note_added: "Note added to log",
};

export function AgentChatPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const fetchChats = useServerFn(listMyChats);
  const fetchMessages = useServerFn(listChatMessages);
  const fetchEvents = useServerFn(listChatEvents);
  const fetchStats = useServerFn(getChatClientStats);
  const fetchHandoff = useServerFn(getChatHandoff);
  const fetchNotes = useServerFn(listChatNotes);
  const addNote = useServerFn(saveChatNote);
  const send = useServerFn(sendChatMessage);
  const take = useServerFn(acceptChat);
  const refuse = useServerFn(declineChat);
  const close = useServerFn(closeChatAsAgent);

  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showHandoff, setShowHandoff] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
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

  const notes = useQuery({
    queryKey: ["chat-notes", openId],
    queryFn: () => fetchNotes({ data: { sessionId: openId! } }),
    enabled: !!openId && showNotes,
  });

  const handoff = useQuery({
    queryKey: ["chat-handoff", openId],
    queryFn: () => fetchHandoff({ data: { sessionId: openId! } }),
    enabled: !!openId,
  });

  const rows = chats.data ?? [];
  const pending = rows.filter((c) => !c.answeredAt && !c.endedAt);
  const activeChats = rows.filter((c) => Boolean(c.answeredAt));
  const current = activeChats.find((c) => c.id === openId) ?? null;
  const alert = useInboxAlert(pending.length);

  useEffect(() => {
    if (openId && !activeChats.some((c) => c.id === openId)) setOpenId(null);
  }, [activeChats, openId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["agent-chats"] });

  /** Ends the conversation and releases the profile, but keeps the dossier open. */
  const closeSession = async (sessionId: string) => {
    if (closingId) return;
    setClosingId(sessionId);
    try {
      await close({ data: { sessionId } });
      await chats.refetch();
      setOpenId(sessionId);
      setShowNotes(true);
      toast.success("Chat closed. Now save the important details in the log.");
    } catch {
      toast.error("Could not close the chat. Please try again.");
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

  const submitNote = async () => {
    const body = noteDraft.trim();
    if (!body || !openId || savingNote) return;
    const sessionId = openId;
    setSavingNote(true);
    try {
      const saved = await addNote({ data: { sessionId, body } });
      const noteId = (saved as { noteId?: string } | undefined)?.noteId;
      if (!noteId) throw new Error("unconfirmed");

      // Read the logbook back and only continue when the entry is really there.
      const fresh = await notes.refetch();
      const confirmed = (fresh.data ?? []).some((n) => n.id === noteId);
      if (!confirmed) throw new Error("unconfirmed");

      setNoteDraft("");
      const wasClosed = current?.requiresLogbook;
      const list = await chats.refetch();
      const stillListed = (list.data ?? []).some((c) => c.id === sessionId);
      if (wasClosed && !stillListed) {
        setOpenId(null);
        toast.success("Note saved. The closed chat has been removed from your list.");
      } else {
        toast.success("Note saved to the log.");
      }
    } catch {
      toast.error("Note could not be confirmed as saved. The chat stays open — please try again.");
    } finally {
      setSavingNote(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Message requests: a quiet inbox, never a ringing call. */}
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Inbox className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Message requests</h2>
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
            <span className="text-xs text-muted-foreground">Sound</span>
            <Switch
              checked={alert.soundOn}
              onCheckedChange={(next) => alert.toggleSound(next)}
              aria-label="Notification sound"
            />
          </div>
        </div>
        {alert.soundOn && alert.permission !== "granted" ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3">
            <span className="flex-1 text-xs text-muted-foreground">
              Allow sound and notifications once, so you also hear new requests
              while this tab is in the background.
            </span>
            <Button size="sm" variant="outline" onClick={() => void alert.enableSound()}>
              Enable sound
            </Button>
          </div>
        ) : null}
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No open message requests. New requests will appear here automatically.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {pending.map((c) => (
              <li key={c.id} className="rounded-2xl border border-primary/30 bg-secondary/30 p-4">
                <div className="flex items-center gap-2">
                  <UserRound className="size-4 text-primary" />
                  <span className="font-semibold">{c.clientAlias}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(c.startedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Wants to chat with{" "}
                  <span className="font-medium text-foreground">{c.profileName}</span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await take({ data: { sessionId: c.id } });
                      setOpenId(c.id);
                      refresh();
                      toast.success("Message request accepted.");
                    }}
                  >
                    Accept request
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
            {activeChats.filter((c) => !c.endedAt).length} active
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,240px)_1fr]">
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {activeChats.length === 0 ? (
              <li className="text-sm text-muted-foreground">No ongoing chats.</li>
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
                          c.endedAt || c.clientAway
                            ? "bg-muted-foreground"
                            : "animate-pulse bg-emerald-500"
                        }`}
                      />
                      as {c.profileName} ·{" "}
                      {c.endedAt
                        ? "fill in log"
                        : c.clientAway
                          ? "client offline"
                          : "connected"}
                    </span>
                  </button>
                  {!c.endedAt ? (
                    <Button
                      size="sm"
                      variant={c.clientAway ? "destructive" : "outline"}
                      className="mt-2 w-full"
                      disabled={closingId === c.id}
                      onClick={() => void closeSession(c.id)}
                    >
                      <X className="size-4" /> Close chat
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          <div className="flex h-[clamp(24rem,55vh,40rem)] flex-col rounded-2xl border border-border bg-secondary/20">
            {current ? (
              <>
                <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
                  <span className="font-semibold">
                    {current.clientAlias}
                    <span className="ml-2 font-normal text-muted-foreground">
                      as {current.profileName}
                    </span>
                    <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                      <span
                        className={`size-2 rounded-full ${
                          current.clientAway
                            ? "bg-muted-foreground"
                            : "animate-pulse bg-emerald-500"
                        }`}
                      />
                      {current.endedAt
                        ? "closed — log still to save"
                        : current.clientAway
                          ? "client has left the chat"
                          : "live connected"}
                    </span>
                  </span>
                  {!current.endedAt ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={closingId === current.id}
                      onClick={() => void closeSession(current.id)}
                    >
                      <X className="size-4" /> Close chat
                    </Button>
                  ) : null}
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
                      {m.is_ai ? (
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                          Stand-in
                        </span>
                      ) : null}
                      {m.body}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                {!current.endedAt ? (
                  <div className="flex items-center gap-2 border-t border-border p-3">
                    <Input
                      value={draft}
                      maxLength={2000}
                      placeholder="Type your reply…"
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
                ) : (
                  <p className="border-t border-border px-4 py-3 text-sm text-primary">
                    This chat is closed. Write the important details below and click
                    Save; the chat will then disappear.
                  </p>
                )}

                <div className="border-t border-border">
                  {handoff.data ? (
                    <div className="border-b border-border">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
                        onClick={() => setShowHandoff((v) => !v)}
                      >
                        {showHandoff ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        <History className="size-4 text-primary" /> History before takeover
                        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {handoff.data.transcript.length}
                        </span>
                        {handoff.data.aiUsed ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                            stand-in was active
                          </span>
                        ) : null}
                      </button>
                      {showHandoff ? (
                        <div className="max-h-56 space-y-2 overflow-y-auto px-4 pb-4">
                          {handoff.data.transcript.map((m, i) => (
                            <div key={i} className="rounded-xl bg-secondary/40 px-3 py-2 text-sm">
                              <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {m.role === "client"
                                  ? "Client"
                                  : m.role === "ai"
                                    ? "Stand-in"
                                    : "Agent"}
                              </span>
                              {m.body}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
                    onClick={() => setShowNotes((v) => !v)}
                  >
                    {showNotes ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                    <NotebookPen className="size-4 text-primary" /> Log
                    {(notes.data ?? []).length > 0 ? (
                      <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {(notes.data ?? []).length}
                      </span>
                    ) : null}
                  </button>
                  {showNotes ? (
                    <div className="px-4 pb-4">
                      <div className="flex items-start gap-2">
                        <Textarea
                          value={noteDraft}
                          maxLength={4000}
                          rows={2}
                          placeholder="Important details about this conversation…"
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              void submitNote();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          disabled={!noteDraft.trim() || savingNote}
                          onClick={() => void submitNote()}
                        >
                          Save
                        </Button>
                      </div>
                      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                        {(notes.data ?? []).length === 0 ? (
                          <li className="text-muted-foreground">
                            No notes for this client yet.
                          </li>
                        ) : (
                          (notes.data ?? []).map((n) => (
                            <li key={n.id} className="rounded-2xl border border-border bg-card p-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {new Date(n.createdAt).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="rounded-full bg-secondary px-2 py-0.5">
                                  {n.source === "chat"
                                    ? "chat"
                                    : n.source === "call"
                                      ? "call"
                                      : "general"}
                                </span>
                                {n.thisConversation ? (
                                  <span className="text-primary">this chat</span>
                                ) : null}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ) : null}
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
                    <BarChart3 className="size-4 text-primary" /> Client statistics
                  </button>
                  {showStats ? (
                    <dl className="grid grid-cols-2 gap-3 px-4 pb-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">Total conversation time</dt>
                        <dd className="font-semibold">{duration(stats.data?.totalSeconds ?? 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Sessions (chat / call)</dt>
                        <dd className="font-semibold">
                          {stats.data?.chatCount ?? 0} / {stats.data?.callCount ?? 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Member since</dt>
                        <dd className="font-semibold">
                          {stats.data?.since
                            ? new Date(stats.data.since).toLocaleDateString("en-GB")
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Messages received</dt>
                        <dd className="font-semibold">{stats.data?.messagesFromClient ?? 0}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Messages sent</dt>
                        <dd className="font-semibold">{stats.data?.messagesFromAgent ?? 0}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Avg. response time</dt>
                        <dd className="font-semibold">
                          {stats.data?.avgAgentReplySeconds != null
                            ? `you ${stats.data.avgAgentReplySeconds}s`
                            : "you —"}
                          {" · "}
                          {stats.data?.avgClientReplySeconds != null
                            ? `client ${stats.data.avgClientReplySeconds}s`
                            : "client —"}
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
                        <li className="text-muted-foreground">No events yet.</li>
                      ) : (
                        (events.data ?? []).map((e) => (
                          <li key={e.id} className="flex gap-3">
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {new Date(e.created_at).toLocaleTimeString("en-GB", {
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
                Accept a message request or pick an ongoing chat to reply.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
