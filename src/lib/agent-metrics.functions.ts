import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DAY = 86_400_000;

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Reply volume, live sessions and response speed for the signed-in agent. */
export const getAgentMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!isStaff && !isAdmin) throw new Error("Forbidden");

    const now = Date.now();
    const since90 = new Date(now - 90 * DAY).toISOString();
    const since7 = now - 7 * DAY;

    const [{ data: mine }, { data: sessions }] = await Promise.all([
      supabaseAdmin
        .from("chat_messages")
        .select("session_id, created_at")
        .eq("sender_user_id", context.userId)
        .eq("sender_role", "agent")
        .gte("created_at", since90)
        .order("created_at", { ascending: true })
        .limit(5000),
      supabaseAdmin
        .from("chat_sessions")
        .select("id, status, ended_at, agent_user_id")
        .is("ended_at", null)
        .eq("status", "active")
        .limit(500),
    ]);

    const replies = mine ?? [];

    // Daily counts, keyed on UTC calendar days.
    const perDay = new Map<string, number>();
    for (const row of replies) {
      const key = dayKey(Date.parse(row.created_at));
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    const series = (days: number) =>
      Array.from({ length: days }, (_, i) => {
        const ts = now - (days - 1 - i) * DAY;
        const key = dayKey(ts);
        return { date: key, count: perDay.get(key) ?? 0 };
      });

    const todayKey = dayKey(now);
    const today = perDay.get(todayKey) ?? 0;

    // Average response time: agent message minus the customer message before it.
    const recentSessionIds = Array.from(
      new Set(
        replies.filter((r) => Date.parse(r.created_at) >= since7).map((r) => r.session_id),
      ),
    ).slice(0, 100);

    let avgResponseSeconds: number | null = null;
    if (recentSessionIds.length > 0) {
      const { data: convo } = await supabaseAdmin
        .from("chat_messages")
        .select("session_id, sender_role, sender_user_id, created_at")
        .in("session_id", recentSessionIds)
        .gte("created_at", new Date(since7).toISOString())
        .order("created_at", { ascending: true })
        .limit(5000);

      const pendingBySession = new Map<string, number>();
      const deltas: number[] = [];
      for (const m of convo ?? []) {
        const at = Date.parse(m.created_at);
        if (m.sender_role === "client") {
          if (!pendingBySession.has(m.session_id)) pendingBySession.set(m.session_id, at);
        } else if (m.sender_user_id === context.userId) {
          const asked = pendingBySession.get(m.session_id);
          if (asked != null) {
            deltas.push((at - asked) / 1000);
            pendingBySession.delete(m.session_id);
          }
        }
      }
      if (deltas.length > 0) {
        avgResponseSeconds = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
      }
    }

    const allActive = sessions ?? [];

    return {
      today,
      last7: series(7),
      last30: series(30),
      last90: series(90),
      total7: series(7).reduce((a, b) => a + b.count, 0),
      total30: series(30).reduce((a, b) => a + b.count, 0),
      total90: series(90).reduce((a, b) => a + b.count, 0),
      activeMine: allActive.filter((s) => s.agent_user_id === context.userId).length,
      activeAll: allActive.length,
      avgResponseSeconds,
    };
  });
