import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { conferenceNameFor, signConferenceAuth } from "@/lib/voice.server";
import { MAX_CHATS_PER_AGENT } from "@/lib/credit-packages";

const ONLINE_WINDOW_MS = 60_000;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const { requireAdmin } = await import("@/lib/admin.server");
  return requireAdmin(Boolean(data));
}

/** Realtime-ish roster: who is on shift, what they are staffing, how busy they are. */
export const listAgentsLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);

    const [{ data: roles }, usersRes, { data: presence }, { data: links }, { data: listeners }] =
      await Promise.all([
        admin.from("user_roles").select("user_id, role"),
        admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        admin.from("agent_presence").select("user_id, status, last_seen_at, active_chat_count"),
        admin.from("listener_agents").select("listener_id, agent_user_id"),
        admin.from("listeners").select("id, display_name, status, is_active, sort_order"),
      ]);

    const emailByUser = new Map<string, string>();
    for (const u of usersRes.data?.users ?? []) emailByUser.set(u.id, u.email ?? "");
    const presenceByUser = new Map((presence ?? []).map((p) => [p.user_id, p]));
    const nameById = new Map((listeners ?? []).map((l) => [l.id, l.display_name]));

    const agents = (roles ?? [])
      .filter((r) => r.role === "staff")
      .map((r) => {
        const p = presenceByUser.get(r.user_id);
        const fresh = p ? Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_WINDOW_MS : false;
        const status = !p || !fresh ? "offline" : p.status;
        return {
          userId: r.user_id,
          username: emailByUser.get(r.user_id)?.split("@")[0] ?? r.user_id.slice(0, 8),
          status,
          lastSeenAt: p?.last_seen_at ?? null,
          activeChats: p?.active_chat_count ?? 0,
          chatSlotsLeft: Math.max(MAX_CHATS_PER_AGENT - (p?.active_chat_count ?? 0), 0),
          profiles: (links ?? [])
            .filter((l) => l.agent_user_id === r.user_id)
            .map((l) => ({ id: l.listener_id, name: nameById.get(l.listener_id) ?? "—" })),
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));

    return {
      agents,
      onlineCount: agents.filter((a) => a.status === "online").length,
      listeners: (listeners ?? []).sort((a, b) => a.sort_order - b.sort_order),
    };
  });

/** Calls and chats that are running right now. */
export const listLiveConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);

    const [{ data: calls }, { data: chats }, { data: listeners }, usersRes, { data: monitors }] =
      await Promise.all([
        admin
          .from("calls")
          .select("id, client_id, listener_id, agent_user_id, status, mode, started_at, answered_at")
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(50),
        admin
          .from("chat_sessions")
          .select("id, client_id, listener_id, agent_user_id, status, mode, started_at, answered_at")
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(50),
        admin.from("listeners").select("id, display_name"),
        admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        admin.from("call_monitor_sessions").select("id, call_id").is("ended_at", null),
      ]);

    const clientIds = Array.from(
      new Set([...(calls ?? []).map((c) => c.client_id), ...(chats ?? []).map((c) => c.client_id)]),
    );
    const { data: profiles } = clientIds.length
      ? await admin.from("profiles").select("id, alias").in("id", clientIds)
      : { data: [] as { id: string; alias: string }[] };

    const alias = new Map((profiles ?? []).map((p) => [p.id, p.alias]));
    const profileName = new Map((listeners ?? []).map((l) => [l.id, l.display_name]));
    const email = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const monitoring = new Set((monitors ?? []).map((m) => m.call_id));
    const agentName = (id: string | null) =>
      id ? (email.get(id)?.split("@")[0] ?? id.slice(0, 8)) : null;

    return {
      calls: (calls ?? []).map((c) => ({
        id: c.id,
        profileName: profileName.get(c.listener_id) ?? "—",
        agent: agentName(c.agent_user_id),
        clientAlias: alias.get(c.client_id) ?? "Anoniem",
        status: c.status,
        mode: c.mode,
        startedAt: c.started_at,
        answeredAt: c.answered_at,
        monitored: monitoring.has(c.id),
      })),
      chats: (chats ?? []).map((c) => ({
        id: c.id,
        profileName: profileName.get(c.listener_id) ?? "—",
        agent: agentName(c.agent_user_id),
        clientAlias: alias.get(c.client_id) ?? "Anoniem",
        status: c.status,
        mode: c.mode,
        startedAt: c.started_at,
        answeredAt: c.answered_at,
      })),
    };
  });

/** Cumulative talk and chat time per customer. */
export const listClientStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);

    const [{ data: profiles }, { data: calls }, { data: chats }, { data: tx }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, alias, credit_seconds, free_seconds_remaining, is_blocked, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("calls").select("client_id, billed_seconds, duration_seconds, cost_cents, ended_at"),
      admin
        .from("chat_sessions")
        .select("client_id, billed_seconds, duration_seconds, cost_cents, ended_at"),
      admin.from("credit_transactions").select("user_id, amount_cents, kind"),
    ]);

    type Bucket = {
      calls: number;
      callSeconds: number;
      chats: number;
      chatSeconds: number;
      spentCents: number;
      purchasedCents: number;
    };
    const empty = (): Bucket => ({
      calls: 0,
      callSeconds: 0,
      chats: 0,
      chatSeconds: 0,
      spentCents: 0,
      purchasedCents: 0,
    });
    const byClient = new Map<string, Bucket>();
    const get = (id: string) => {
      let b = byClient.get(id);
      if (!b) {
        b = empty();
        byClient.set(id, b);
      }
      return b;
    };

    for (const c of calls ?? []) {
      if (!c.ended_at) continue;
      const b = get(c.client_id);
      b.calls += 1;
      b.callSeconds += c.billed_seconds ?? 0;
      b.spentCents += c.cost_cents ?? 0;
    }
    for (const c of chats ?? []) {
      if (!c.ended_at) continue;
      const b = get(c.client_id);
      b.chats += 1;
      b.chatSeconds += c.billed_seconds ?? 0;
      b.spentCents += c.cost_cents ?? 0;
    }
    for (const t of tx ?? []) {
      if (t.kind !== "purchase") continue;
      get(t.user_id).purchasedCents += t.amount_cents ?? 0;
    }

    return (profiles ?? []).map((p) => {
      const b = byClient.get(p.id) ?? empty();
      return {
        id: p.id,
        alias: p.alias,
        createdAt: p.created_at,
        isBlocked: p.is_blocked,
        creditSeconds: p.credit_seconds,
        freeSeconds: p.free_seconds_remaining,
        ...b,
        totalSeconds: b.callSeconds + b.chatSeconds,
      };
    });
  });

/** Join a live call muted so neither the customer nor the agent notices. */
export const startMonitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);

    const { data: call } = await admin
      .from("calls")
      .select("id, ended_at, answered_at")
      .eq("id", data.callId)
      .maybeSingle();
    if (!call || call.ended_at || !call.answered_at) {
      return { ok: false as const, reason: "not_live", monitorId: null, conferenceAuth: null };
    }

    const { data: row, error } = await admin
      .from("call_monitor_sessions")
      .insert({ call_id: data.callId, admin_user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const conferenceAuth = await signConferenceAuth(
      context.userId,
      conferenceNameFor(data.callId),
      "monitor",
      expiresAt,
    );

    return { ok: true as const, reason: null, monitorId: row.id, conferenceAuth };
  });

export const stopMonitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ monitorId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    await admin
      .from("call_monitor_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", data.monitorId)
      .eq("admin_user_id", context.userId)
      .is("ended_at", null);
    return { ok: true as const };
  });
