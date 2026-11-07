import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortalAnalytics } from "@/lib/portal.functions";
import { MAX_OPEN_CHATS, type Period } from "@/lib/portal-rules";
import { StatusPill, formatStamp } from "@/components/portal/shared";

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>("day");
  const fetchStats = useServerFn(getPortalAnalytics);
  const stats = useQuery({
    queryKey: ["portal-analytics", period],
    queryFn: () => fetchStats({ data: { period } }),
    refetchInterval: 15000,
  });
  const d = stats.data;

  const cards = [
    { label: "Incoming Messages", value: d?.incomingMessages, note: `Customer messages this ${period}` },
    { label: "Website/App Visitors", value: d?.visitors, note: "Unique visitors" },
    { label: "New User Registrations", value: d?.registrations, note: "On the customer site", accent: "text-primary" },
    { label: "Active Agents Online", value: d?.onlineAgents, note: `Cap: ${MAX_OPEN_CHATS} chats max / agent`, accent: "text-success" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">System &amp; Agent Analytics</h1>
          <p className="text-sm text-muted-foreground">Live performance and conversation volume</p>
        </div>
        <div className="flex rounded-xl border border-border bg-card p-1">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition ${
                period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Per {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
            <p className={`mt-2 text-3xl font-extrabold tabular-nums ${c.accent ?? ""}`}>
              {c.value == null ? "…" : c.value.toLocaleString("en-GB")}
            </p>
            <span className="mt-2 inline-block text-[11px] text-muted-foreground">{c.note}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">Messages Processed Per Agent ({period.toUpperCase()})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Agent</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last State Change</th>
                <th className="p-3">Active Capacity</th>
                <th className="p-3 text-right">Messages ({period})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(d?.agents ?? []).map((a) => (
                <tr key={a.userId} className="hover:bg-secondary/40">
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                        {a.username[0]?.toUpperCase()}
                      </span>
                      {a.username}
                    </span>
                  </td>
                  <td className="p-3"><StatusPill status={a.status} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{formatStamp(a.lastStatusChange)}</td>
                  <td className="p-3 text-xs font-semibold text-primary">
                    {a.activeChats} / {MAX_OPEN_CHATS} chats max
                  </td>
                  <td className="p-3 text-right font-bold tabular-nums">{a.messages}</td>
                </tr>
              ))}
              {d && d.agents.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-sm text-muted-foreground">No agent accounts yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
