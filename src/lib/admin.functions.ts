import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_CHATS_PER_AGENT } from "@/lib/credit-packages";
import { clampToBaseline } from "@/lib/analytics-baseline";

const ONLINE_WINDOW_MS = 60_000;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const { requireAdmin } = await import("@/lib/admin.server");
  return requireAdmin(Boolean(data));
}

/** Realtime-ish roster: who is on shift, what they are handling, how busy they are. */
export const listAgentsLive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);

    const [{ data: roles }, usersRes, { data: presence }] = await Promise.all([
      admin.from("user_roles").select("user_id, role"),
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin
        .from("agent_presence")
        .select("user_id, status, availability, last_seen_at, online_since, active_chat_count"),
    ]);

    const emailByUser = new Map<string, string>();
    for (const u of usersRes.data?.users ?? []) emailByUser.set(u.id, u.email ?? "");
    const presenceByUser = new Map((presence ?? []).map((p) => [p.user_id, p]));

    const agents = (roles ?? [])
      .filter((r) => r.role === "staff")
      .map((r) => {
        const p = presenceByUser.get(r.user_id);
        const fresh = p
          ? Date.now() - new Date(p.last_seen_at).getTime() < ONLINE_WINDOW_MS
          : false;
        const availability = !p || !fresh ? "offline" : p.availability;
        const inChat = (p?.active_chat_count ?? 0) > 0;
        return {
          userId: r.user_id,
          username: emailByUser.get(r.user_id)?.split("@")[0] ?? r.user_id.slice(0, 8),
          availability,
          inChat,
          activeChats: p?.active_chat_count ?? 0,
          onlineSince: p?.online_since ?? null,
          lastSeenAt: p?.last_seen_at ?? null,
          handling: [] as { sessionId: string; clientAlias: string; profileName: string }[],
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));

    return {
      agents,
      onlineCount: agents.filter((a) => a.availability !== "offline").length,
      queueWaiting: 0,
    };
  });

/** Chats that are running right now. */
export const listLiveConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);

    const [{ data: chats }, { data: listeners }, usersRes] = await Promise.all([
      admin
        .from("chat_sessions")
        .select("id, client_id, listener_id, agent_user_id, status, mode, started_at, answered_at")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(50),
      admin.from("listeners").select("id, display_name"),
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const clientIds = Array.from(new Set((chats ?? []).map((c) => c.client_id)));
    const { data: profiles } = clientIds.length
      ? await admin.from("profiles").select("id, alias").in("id", clientIds)
      : { data: [] as { id: string; alias: string }[] };

    const alias = new Map((profiles ?? []).map((p) => [p.id, p.alias]));
    const profileName = new Map((listeners ?? []).map((l) => [l.id, l.display_name]));
    const email = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const agentName = (id: string | null) =>
      id ? (email.get(id)?.split("@")[0] ?? id.slice(0, 8)) : null;

    return {
      chats: (chats ?? []).map((c) => ({
        id: c.id,
        profileName: profileName.get(c.listener_id ?? "") ?? "—",
        agent: agentName(c.agent_user_id),
        clientAlias: alias.get(c.client_id) ?? "Anoniem",
        status: c.status,
        mode: c.mode,
        startedAt: c.started_at,
        answeredAt: c.answered_at,
      })),
    };
  });

/** Cumulative chat activity per customer. */
export const getTrafficStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const since = clampToBaseline(new Date(Date.now() - data.days * 86_400_000).toISOString());

    const [{ data: visits }, { data: profiles }] = await Promise.all([
      admin
        .from("site_visits")
        .select("visitor_id, country, path, created_at, user_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000),
      admin
        .from("profiles")
        .select("id, signup_country, created_at")
        .gte("created_at", since),
    ]);

    const rows = visits ?? [];
    const uniques = new Set(rows.map((v) => v.visitor_id));

    const byCountry = new Map<string, { visits: number; visitors: Set<string>; signups: number }>();
    const bucket = (code: string | null) => {
      const key = code ?? "Unknown";
      let b = byCountry.get(key);
      if (!b) {
        b = { visits: 0, visitors: new Set<string>(), signups: 0 };
        byCountry.set(key, b);
      }
      return b;
    };
    for (const v of rows) {
      const b = bucket(v.country);
      b.visits += 1;
      b.visitors.add(v.visitor_id);
    }
    for (const p of profiles ?? []) bucket(p.signup_country).signups += 1;

    const byDay = new Map<string, { visitors: Set<string>; signups: number }>();
    const day = (iso: string) => {
      const key = iso.slice(0, 10);
      let d = byDay.get(key);
      if (!d) {
        d = { visitors: new Set<string>(), signups: 0 };
        byDay.set(key, d);
      }
      return d;
    };
    for (const v of rows) day(v.created_at).visitors.add(v.visitor_id);
    for (const p of profiles ?? []) day(p.created_at).signups += 1;

    const byPage = new Map<string, number>();
    for (const v of rows) byPage.set(v.path, (byPage.get(v.path) ?? 0) + 1);

    return {
      days: data.days,
      pageViews: rows.length,
      uniqueVisitors: uniques.size,
      signups: (profiles ?? []).length,
      countries: Array.from(byCountry.entries())
        .map(([country, b]) => ({
          country,
          visits: b.visits,
          visitors: b.visitors.size,
          signups: b.signups,
        }))
        .sort((a, b) => b.visitors - a.visitors || b.signups - a.signups),
      daily: Array.from(byDay.entries())
        .map(([date, d]) => ({ date, visitors: d.visitors.size, signups: d.signups }))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 30),
      topPages: Array.from(byPage.entries())
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
    };
  });

/** Cumulative chat activity per customer. */
export const listClientStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);

    const [{ data: profiles }, { data: chats }, { data: tx }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, alias, chat_credits, free_credits, is_blocked, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      admin
        .from("chat_sessions")
        .select("client_id, billed_seconds, duration_seconds, cost_cents, ended_at"),
      admin.from("credit_transactions").select("user_id, amount_cents, credits_delta, kind"),
    ]);

    type Bucket = {
      chats: number;
      chatSeconds: number;
      messages: number;
      spentCents: number;
      purchasedCents: number;
      bought: number;
    };
    const empty = (): Bucket => ({
      chats: 0,
      chatSeconds: 0,
      messages: 0,
      spentCents: 0,
      purchasedCents: 0,
      bought: 0,
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

    for (const c of chats ?? []) {
      if (!c.ended_at) continue;
      const b = get(c.client_id);
      b.chats += 1;
      b.chatSeconds += c.billed_seconds ?? 0;
      b.spentCents += c.cost_cents ?? 0;
    }
    for (const t of tx ?? []) {
      if (t.kind === "purchase") {
        get(t.user_id).purchasedCents += t.amount_cents ?? 0;
        get(t.user_id).bought += Math.max(t.credits_delta ?? 0, 0);
      } else if ((t.credits_delta ?? 0) < 0) {
        get(t.user_id).messages += Math.abs(t.credits_delta ?? 0);
      }
    }

    return (profiles ?? []).map((p) => {
      const b = byClient.get(p.id) ?? empty();
      return {
        id: p.id,
        alias: p.alias,
        createdAt: p.created_at,
        isBlocked: p.is_blocked,
        credits: p.chat_credits,
        freeCredits: p.free_credits,
        ...b,
      };
    });
  });
