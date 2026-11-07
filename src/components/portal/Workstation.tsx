import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Inbox, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptChat,
  claimNextChat,
  closeChatAsAgent,
  declineChat,
  getChatClientStats,
  listChatMessages,
  listChatNotes,
  listMyChats,
  saveChatNote,
  sendChatMessage,
} from "@/lib/chat.functions";
import { MAX_OPEN_CHATS, NOTE_CATEGORIES, type NoteCategory } from "@/lib/portal-rules";
import { useInboxAlert } from "@/hooks/useInboxAlert";
import { Transcript, formatStamp } from "@/components/portal/shared";

/** Agent Messages tab: queue (left), live thread (middle), customer profile + logger (right). */
export function Workstation({ online, username }: { online: boolean; username: string }) {
  const queryClient = useQueryClient();
  const fetchChats = useServerFn(listMyChats);
  const fetchMessages = useServerFn(listChatMessages);
  const fetchNotes = useServerFn(listChatNotes);
  const fetchStats = useServerFn(getChatClientStats);
  const send = useServerFn(sendChatMessage);
  const accept = useServerFn(acceptChat);
  const decline = useServerFn(declineChat);
  const close = useServerFn(closeChatAsAgent);
  const claim = useServerFn(claimNextChat);
  const addNote = useServerFn(saveChatNote);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<NoteCategory>("Name");
  const [noteText, setNoteText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const chats = useQuery({ queryKey: ["my-chats"], queryFn: () => fetchChats(), refetchInterval: 3000 });
  const list = chats.data ?? [];
  const mine = list.filter((c) => !c.endedAt && c.status === "active");
  const ringing = list.filter((c) => !c.endedAt && (c.status === "ringing" || c.status === "queued"));
  const active = list.find((c) => c.id === selectedId) ?? null;

  useInboxAlert(online ? ringing.length : 0);

  useEffect(() => {
    if (!selectedId && list.length > 0) setSelectedId(list[0]!.id);
  }, [list, selectedId]);

  const owned = Boolean(active && (active.status === "active" || (active.endedAt && active.answeredAt)));
  const messages = useQuery({
    queryKey: ["agent-messages", selectedId],
    queryFn: () => fetchMessages({ data: { sessionId: selectedId! } }),
    enabled: Boolean(selectedId) && owned,
    refetchInterval: 2000,
  });
  const notes = useQuery({
    queryKey: ["agent-notes", selectedId],
    queryFn: () => fetchNotes({ data: { sessionId: selectedId! } }),
    enabled: Boolean(selectedId) && owned,
  });
  const stats = useQuery({
    queryKey: ["agent-client-stats", selectedId],
    queryFn: () => fetchStats({ data: { sessionId: selectedId! } }),
    enabled: Boolean(selectedId) && owned,
    refetchInterval: 15000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const refreshChats = () => void queryClient.invalidateQueries({ queryKey: ["my-chats"] });

  const sendMutation = useMutation({
    mutationFn: (body: string) => send({ data: { sessionId: selectedId!, body } }),
    onSuccess: (r, body) => {
      if (!r.ok) {
        setDraft(body);
        toast.error(r.reason === "closed" ? "This chat has ended." : "Message could not be sent.");
        return;
      }
      void messages.refetch();
    },
    onError: (e: Error, body) => { setDraft(body); toast.error(e.message); },
  });
  const acceptMutation = useMutation({
    mutationFn: (id: string) => accept({ data: { sessionId: id } }),
    onSuccess: (r, id) => {
      if (!r.ok) toast.error("This request is no longer available.");
      else setSelectedId(id);
      refreshChats();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const declineMutation = useMutation({
    mutationFn: (id: string) => decline({ data: { sessionId: id } }),
    onSuccess: refreshChats,
  });
  const closeMutation = useMutation({
    mutationFn: (id: string) => close({ data: { sessionId: id } }),
    onSuccess: () => { toast.success("Chat ended. Log what you learned to clear it."); refreshChats(); },
  });
  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r) => {
      if (r.sessionId) { setSelectedId(r.sessionId); toast.success("New chat assigned"); }
      else toast.info("No chats waiting, or you already have 2 open.");
      refreshChats();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const noteMutation = useMutation({
    mutationFn: () => addNote({ data: { sessionId: selectedId!, body: noteText, category } }),
    onSuccess: () => {
      setNoteText("");
      toast.success("Info saved");
      void notes.refetch();
      refreshChats();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;
    setDraft("");
    sendMutation.mutate(body);
  };

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-7rem)] lg:grid-cols-12">
      {/* Left: queue and conversation switcher */}
      <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-3">
        <div className="border-b border-border bg-background p-4">
          <h1 className="text-sm font-bold">Assigned &amp; Incoming Chats</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Capacity: {mine.length} / {MAX_OPEN_CHATS} active
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            disabled={!online || mine.length >= MAX_OPEN_CHATS || claimMutation.isPending}
            onClick={() => claimMutation.mutate()}
          >
            <Inbox className="size-4" /> Take next waiting chat
          </Button>
          {!online ? <p className="mt-2 text-xs text-warning">Switch to Online to receive chats.</p> : null}
        </div>
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {list.map((c) => {
            const isRinging = !c.endedAt && (c.status === "ringing" || c.status === "queued");
            return (
              <li key={c.id}>
                <div
                  className={`flex flex-col gap-2 p-4 transition ${selectedId === c.id ? "border-l-4 border-primary bg-primary/10" : "hover:bg-secondary/40"}`}
                >
                  <button type="button" onClick={() => setSelectedId(c.id)} className="flex flex-col gap-2 text-left">
                    <span className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">{c.profileName}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] ${
                          c.endedAt
                            ? "border-border text-muted-foreground"
                            : isRinging
                              ? "border-warning/50 bg-warning/15 text-warning"
                              : "border-success/50 bg-success/15 text-success"
                        }`}
                      >
                        {c.endedAt ? "Ended · log info" : isRinging ? "Incoming" : c.clientAway ? "Away" : "Active"}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                        {c.clientAlias.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="truncate text-sm font-semibold">{c.clientAlias}</span>
                    </span>
                  </button>
                  {isRinging ? (
                    <span className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={!online || mine.length >= MAX_OPEN_CHATS} onClick={() => acceptMutation.mutate(c.id)}>Accept</Button>
                      {c.status === "ringing" ? (
                        <Button size="sm" variant="ghost" onClick={() => declineMutation.mutate(c.id)}>Decline</Button>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
          {list.length === 0 ? <li className="p-4 text-sm text-muted-foreground">No chats yet.</li> : null}
        </ul>
      </section>

      {/* Middle: live thread */}
      <section className="flex min-h-96 flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-5">
        {active && owned ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border bg-background p-4">
              <div>
                <h2 className="text-sm font-bold">{active.clientAlias}</h2>
                <p className="text-xs text-muted-foreground">Connected to: {active.profileName}</p>
              </div>
              <span className="flex items-center gap-2">
                <span className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">Agent: {username}</span>
                {!active.endedAt ? (
                  <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("End this chat?")) closeMutation.mutate(active.id); }}>
                    <X className="size-4" /> End
                  </Button>
                ) : null}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto bg-background/40 p-4">
              <Transcript messages={messages.data ?? []} />
              <div ref={bottomRef} />
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-border bg-background p-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={active.endedAt ? "This chat has ended" : "Type your response…"}
                aria-label="Reply"
                disabled={!online || Boolean(active.endedAt)}
                className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-60"
              />
              <Button type="submit" disabled={!online || Boolean(active.endedAt) || !draft.trim()}>
                <Send className="size-4" /> Send
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {active ? "Accept this chat to open the conversation." : "Select a chat to begin"}
          </div>
        )}
      </section>

      {/* Right: customer profile + information logger */}
      <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-4">
        {active && owned ? (
          <>
            <div className="border-b border-border bg-background p-4">
              <h2 className="text-sm font-bold">Customer Profile &amp; Info</h2>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="space-y-1 rounded-lg border border-border bg-background p-3 text-xs">
                <p className="text-muted-foreground">Alias: <span className="text-foreground">{active.clientAlias}</span></p>
                <p className="text-muted-foreground">Member since: <span className="text-foreground">{formatStamp(active.clientSince)}</span></p>
                <p className="text-muted-foreground">Chats with you: <span className="text-foreground">{stats.data?.chatCount ?? "…"}</span></p>
                <p className="text-muted-foreground">Messages this chat: <span className="text-foreground">{stats.data ? stats.data.messagesFromClient + stats.data.messagesFromAgent : "…"}</span></p>
                <p className="text-muted-foreground">Source: <span className="text-foreground">anontalk.online</span></p>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recorded Dossier Logs</h3>
                <div className="space-y-2">
                  {(notes.data ?? []).map((n) => (
                    <div key={n.id} className="rounded-lg border border-border bg-background p-2.5 text-xs">
                      <span className="font-semibold text-primary">{n.category ?? "Note"}:</span> {n.body}
                    </div>
                  ))}
                  {notes.data && notes.data.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">No information logged for this user yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); if (noteText.trim()) noteMutation.mutate(); }}
              className="space-y-2 border-t border-border bg-background p-4"
            >
              <h3 className="flex items-center gap-1.5 text-xs font-bold">
                <FileText className="size-3.5 text-primary" /> Log Customer Information
              </h3>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory)}
                aria-label="Category"
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
              >
                {NOTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log notes about this category…"
                rows={2}
                aria-label="Note"
                className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-xs focus:border-primary focus:outline-none"
              />
              <Button type="submit" size="sm" className="w-full" disabled={noteMutation.isPending || !noteText.trim()}>
                Save Info Log
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">No profile loaded</div>
        )}
      </section>
    </div>
  );
}
