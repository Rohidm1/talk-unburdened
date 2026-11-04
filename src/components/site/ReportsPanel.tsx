import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Report = {
  id: string;
  reporter_id: string;
  reported_id: string | null;
  target_type: string;
  target_id: string;
  reason: string | null;
  excerpt: string | null;
  blocked: boolean;
  status: string;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  community_post: "Community post",
  speed_chat: "Speed Chat",
  chat: "Chat",
  buddy: "Buddy",
  bottle: "Bottle",
};

/** Admin moderation queue: user reports and blocks. */
export function ReportsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "all">("open");

  const reports = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let q = supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter === "open") q = q.eq("status", "open");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const blocks = useQuery({
    queryKey: ["admin-blocks"],
    queryFn: async () => {
      const { count } = await supabase.from("user_blocks").select("blocker_id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const act = async (id: string, action: "dismiss" | "hide" | "suspend") => {
    if (action === "suspend" && !window.confirm("Suspend this account? They won't be able to send messages or buy credits.")) return;
    const { error } = await supabase.rpc("admin_resolve_report", { _report_id: id, _action: action });
    if (error) return void toast.error(error.message.includes("no_account") ? "No account linked to this report." : "Action failed.");
    toast.success(action === "dismiss" ? "Dismissed." : action === "hide" ? "Content hidden." : "Account suspended.");
    void qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const list = reports.data ?? [];
  const repeat = new Map<string, number>();
  list.forEach((r) => r.reported_id && repeat.set(r.reported_id, (repeat.get(r.reported_id) ?? 0) + 1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {list.length} {filter === "open" ? "open" : "total"} reports · {blocks.data ?? 0} blocks between users
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "open" ? "default" : "outline"} onClick={() => setFilter("open")}>Open</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>
      {reports.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!reports.isLoading && list.length === 0 ? <p className="text-sm text-muted-foreground">No reports. 🎉</p> : null}
      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-foreground">{TYPE_LABEL[r.target_type] ?? r.target_type}</span>
                {" · "}
                {new Date(r.created_at).toLocaleString("en-GB")}
                {r.blocked ? " · reporter blocked them" : ""}
                {r.reported_id && (repeat.get(r.reported_id) ?? 0) > 1 ? ` · ${repeat.get(r.reported_id)} reports on this account` : ""}
              </span>
              <span className={r.status === "open" ? "text-destructive" : ""}>{r.status}</span>
            </div>
            <p className="mt-2 text-sm font-medium">{r.reason || "No reason given"}</p>
            {r.excerpt ? <p className="mt-2 rounded-xl bg-muted/50 p-3 text-sm">“{r.excerpt}”</p> : null}
            {r.status === "open" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void act(r.id, "dismiss")}>Dismiss</Button>
                {r.target_type === "community_post" || r.target_type === "bottle" ? (
                  <Button size="sm" variant="outline" onClick={() => void act(r.id, "hide")}>Hide content</Button>
                ) : null}
                {r.reported_id ? (
                  <Button size="sm" variant="destructive" onClick={() => void act(r.id, "suspend")}>Suspend account</Button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
