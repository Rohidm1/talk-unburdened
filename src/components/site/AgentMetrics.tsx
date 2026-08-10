import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BarChart3, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgentMetrics } from "@/lib/agent-metrics.functions";

type Range = 7 | 30 | 90;

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AgentMetrics() {
  const fetchMetrics = useServerFn(getAgentMetrics);
  const [range, setRange] = useState<Range>(7);

  const metrics = useQuery({
    queryKey: ["agent-metrics"],
    queryFn: () => fetchMetrics(),
    refetchInterval: 30000,
  });

  const data = metrics.data;
  const series = data ? (range === 7 ? data.last7 : range === 30 ? data.last30 : data.last90) : [];
  const total = data ? (range === 7 ? data.total7 : range === 30 ? data.total30 : data.total90) : 0;
  const peak = Math.max(1, ...series.map((d) => d.count));

  return (
    <section className="space-y-3 border-b border-border p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your performance
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={Zap}
          label="Replies today"
          value={String(data?.today ?? 0)}
          hint="Resets at 00:00 UTC"
        />
        <Stat
          icon={Activity}
          label="Active chats"
          value={String(data?.activeMine ?? 0)}
          hint={`${data?.activeAll ?? 0} live platform-wide`}
        />
        <Stat
          icon={Timer}
          label="Avg. response"
          value={
            data?.avgResponseSeconds != null
              ? data.avgResponseSeconds >= 60
                ? `${Math.round(data.avgResponseSeconds / 60)}m`
                : `${data.avgResponseSeconds}s`
              : "—"
          }
          hint="Last 7 days"
        />
        <Stat icon={BarChart3} label={`Last ${range} days`} value={String(total)} hint="Replies" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-1">
          {([7, 30, 90] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
        <div className="flex h-16 items-end gap-[2px]">
          {series.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              className="min-w-[2px] flex-1 rounded-t-sm bg-primary/70"
              style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
