import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Radio } from "lucide-react";
import {
  getPortalAnalytics,
  getTranscriptAdmin,
  listAgentArchive,
  listLiveChatsAdmin,
} from "@/lib/portal.functions";
import { Transcript, formatStamp } from "@/components/portal/shared";

type Row = Awaited<ReturnType<typeof listLiveChatsAdmin>>[number];

/** Admin view of the Messages tab: live chats across all agents plus past transcripts. */
export function AdminMonitor() {
  const fetchLive = useServerFn(listLiveChatsAdmin);
  const fetchArchive = useServerFn(listAgentArchive);
  const fetchTranscript = useServerFn(getTranscriptAdmin);
  const fetchAgents = useServerFn(getPortalAnalytics);

  const [mode, setMode] = useState<"live" | "archive">("live");
  const [agentId, setAgentId] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);

  const live = useQuery({ queryKey: ["admin-live"], queryFn: () => fetchLive(), refetchInterval: 4000, enabled: mode === "live" });
  const agents = useQuery({ queryKey: ["portal-analytics", "month"], queryFn: () => fetchAgents({ data: { period: "month" } }) });
  const archive = useQuery({
    queryKey: ["admin-archive", agentId],
    queryFn: () => fetchArchive({ data: { agentUserId: agentId } }),
    enabled: mode === "archive" && Boolean(agentId),
  });
  const transcript = useQuery({
    queryKey: ["admin-transcript", selected],
    queryFn: () => fetchTranscript({ data: { sessionId: selected! } }),
    enabled: Boolean(selected),
    refetchInterval: mode === "live" ? 3000 : false,
  });

  const rows: Row[] = (mode === "live" ? live.data : archive.data) ?? [];
  const current = rows.find((r) => r.id === selected) ?? null;

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-7rem)] lg:grid-cols-12">
      <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-4">
        <div className="space-y-3 border-b border-border bg-background p-4">
          <h1 className="text-sm font-bold">Conversation monitor</h1>
          <div className="flex rounded-lg border border-border p-1 text-xs font-semibold">
            <button type="button" onClick={() => { setMode("live"); setSelected(null); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 ${mode === "live" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Radio className="size-3.5" /> Live now
            </button>
            <button type="button" onClick={() => { setMode("archive"); setSelected(null); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 ${mode === "archive" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Eye className="size-3.5" /> Past per agent
            </button>
          </div>
          {mode === "archive" ? (
            <select
              value={agentId}
              onChange={(e) => { setAgentId(e.target.value); setSelected(null); }}
              aria-label="Choose agent"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Choose an agent…</option>
              {(agents.data?.agents ?? []).map((a) => (
                <option key={a.userId} value={a.userId}>{a.username}</option>
              ))}
            </select>
          ) : null}
        </div>
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelected(r.id)}
                className={`flex w-full flex-col gap-1 p-4 text-left transition ${selected === r.id ? "border-l-4 border-primary bg-primary/10" : "hover:bg-secondary/40"}`}
              >
                <span className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-primary">{r.profileName}</span>
                  <span className="text-muted-foreground">{r.agent}</span>
                </span>
                <span className="text-sm font-semibold">{r.customer}</span>
                <span className="text-xs text-muted-foreground">{formatStamp(r.startedAt)}</span>
              </button>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">
              {mode === "live" ? "No conversations running right now." : agentId ? "No past conversations." : "Pick an agent to see their history."}
            </li>
          ) : null}
        </ul>
      </section>

      <section className="flex min-h-96 flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-5">
        {current ? (
          <>
            <div className="border-b border-border bg-background p-4">
              <h2 className="text-sm font-bold">{current.customer}</h2>
              <p className="text-xs text-muted-foreground">Profile: {current.profileName} · Agent: {current.agent}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Transcript messages={transcript.data?.messages ?? []} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a conversation</div>
        )}
      </section>

      <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:col-span-3">
        <div className="border-b border-border bg-background p-4"><h2 className="text-sm font-bold">Logged customer info</h2></div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {(transcript.data?.notes ?? []).map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-background p-2.5 text-xs">
              <span className="font-semibold text-primary">{n.category ?? "Note"}:</span> {n.body}
            </div>
          ))}
          {current && (transcript.data?.notes ?? []).length === 0 ? (
            <p className="text-xs italic text-muted-foreground">Nothing logged yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
