import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const { requireAdmin } = await import("@/lib/admin.server");
  return requireAdmin(Boolean(data));
}

/** Conversations where the stand-in is currently answering. */
export const listAiConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context);

    const { data: sessions } = await admin
      .from("chat_sessions")
      .select("id, client_id, listener_id, status, ai_active, ai_muted, started_at, ended_at")
      .eq("ai_active", true)
      .order("started_at", { ascending: false })
      .limit(25);

    const rows = sessions ?? [];
    const listenerIds = Array.from(new Set(rows.map((s) => s.listener_id).filter(Boolean)));
    const clientIds = Array.from(new Set(rows.map((s) => s.client_id)));

    const [{ data: listeners }, { data: profiles }] = await Promise.all([
      listenerIds.length
        ? admin.from("listeners").select("id, display_name").in("id", listenerIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
      clientIds.length
        ? admin.from("profiles").select("id, alias").in("id", clientIds)
        : Promise.resolve({ data: [] as { id: string; alias: string }[] }),
    ]);

    const nameOf = new Map((listeners ?? []).map((l) => [l.id, l.display_name]));
    const aliasOf = new Map((profiles ?? []).map((p) => [p.id, p.alias]));

    return {
      conversations: rows.map((s) => ({
        id: s.id,
        profileName: nameOf.get(s.listener_id ?? "") ?? "—",
        clientAlias: aliasOf.get(s.client_id) ?? "Anonymous",
        status: s.status,
        muted: s.ai_muted,
        startedAt: s.started_at,
        endedAt: s.ended_at,
      })),
    };
  });

/** Full transcript of one monitored conversation. */
export const getAiTranscript = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const { data: messages } = await admin
      .from("chat_messages")
      .select("id, sender_role, body, is_ai, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(300);
    return { messages: messages ?? [] };
  });

/** Match success, stickiness, feature usage and mood distribution. */
export const getEngagementAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number } | undefined) =>
    z.object({ days: z.number().int().min(1).max(90).default(30) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context);
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const [{ data: events }, { data: sessions }, { data: visits }] = await Promise.all([
      admin
        .from("engagement_events")
        .select("event, mood, depth, user_id, created_at")
        .gte("created_at", since)
        .limit(20000),
      admin
        .from("chat_sessions")
        .select("id, client_id, answered_at, started_at, ended_at, duration_seconds")
        .gte("started_at", since)
        .limit(5000),
      admin
        .from("site_visits")
        .select("visitor_id, created_at")
        .gte("created_at", since)
        .limit(20000),
    ]);

    const rows = events ?? [];
    const count = (name: string) => rows.filter((r) => r.event === name).length;

    const chats = sessions ?? [];
    const matched = chats.filter((c) => c.answered_at).length;
    const skipped = Math.max(chats.length - matched, 0);

    const durations = chats
      .map((c) => c.duration_seconds ?? 0)
      .filter((s) => s > 0)
      .sort((a, b) => a - b);
    const avgSession = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    const byDay = new Map<string, { visitors: Set<string>; chats: number }>();
    const day = (iso: string) => {
      const key = iso.slice(0, 10);
      let d = byDay.get(key);
      if (!d) {
        d = { visitors: new Set<string>(), chats: 0 };
        byDay.set(key, d);
      }
      return d;
    };
    for (const v of visits ?? []) day(v.created_at).visitors.add(v.visitor_id);
    for (const c of chats) day(c.started_at).chats += 1;

    const daily = Array.from(byDay.entries())
      .map(([date, d]) => ({ date, dau: d.visitors.size, chats: d.chats }))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(-30);

    const chatters = new Set(chats.map((c) => c.client_id));
    const uniqueVisitors = new Set((visits ?? []).map((v) => v.visitor_id)).size;
    const bounceRate = uniqueVisitors
      ? Math.round(((uniqueVisitors - Math.min(chatters.size, uniqueVisitors)) / uniqueVisitors) * 100)
      : 0;

    const moodTally = new Map<string, number>();
    for (const r of rows) {
      if (r.event !== "mood_selected" || !r.mood) continue;
      moodTally.set(r.mood, (moodTally.get(r.mood) ?? 0) + 1);
    }
    const depthTally = new Map<string, number>();
    for (const r of rows) {
      if (r.event !== "depth_selected" || !r.depth) continue;
      depthTally.set(r.depth, (depthTally.get(r.depth) ?? 0) + 1);
    }

    return {
      days: data.days,
      match: {
        started: chats.length,
        matched,
        skipped,
        successRate: chats.length ? Math.round((matched / chats.length) * 100) : 0,
      },
      stickiness: {
        avgDau: daily.length ? Math.round(daily.reduce((a, d) => a + d.dau, 0) / daily.length) : 0,
        uniqueVisitors,
        chatters: chatters.size,
        bounceRate,
        avgSessionSeconds: avgSession,
      },
      daily,
      features: [
        { key: "Icebreaker dice", value: count("icebreaker_dice") },
        { key: "Quiz answers", value: count("quiz_answered") },
        { key: "Mystery boxes", value: count("mystery_box_unlocked") },
        { key: "Bonus claimed", value: count("bonus_claimed") },
        { key: "Compliments", value: count("compliment_sent") },
        { key: "Mood picks", value: count("mood_selected") },
      ].sort((a, b) => b.value - a.value),
      moods: Array.from(moodTally.entries())
        .map(([mood, value]) => ({ mood, value }))
        .sort((a, b) => b.value - a.value),
      depths: Array.from(depthTally.entries())
        .map(([depth, value]) => ({ depth, value }))
        .sort((a, b) => b.value - a.value),
    };
  });