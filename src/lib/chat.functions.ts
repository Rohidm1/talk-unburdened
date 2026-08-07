import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHAT_RATE_CENTS_PER_MINUTE, FREE_CALL_MAX_SECONDS } from "@/lib/credit-packages";

const sessionInput = (input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input);

/* ------------------------------------------------------------------ client */

/**
 * Starts a chat with a fictional profile. Nothing is metered until an agent
 * accepts — exactly like the phone line, and out of the same credit pool.
 */
export const startChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ listenerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.rpc("settle_stale_chats", {
      _user_id: userId,
      _rate_cents: CHAT_RATE_CENTS_PER_MINUTE,
    });

    const deny = (reason: "blocked" | "no_credit" | "free_used" | "busy") =>
      ({ ok: false as const, reason, sessionId: null, allowanceSeconds: 0, mode: "paid" }) as const;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credit_seconds, free_seconds_remaining, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) return deny("no_credit");
    if (profile.is_blocked) return deny("blocked");

    const free = profile.free_seconds_remaining;
    const mode: "paid" | "free" = profile.credit_seconds <= 0 ? "free" : "paid";
    const allowance =
      mode === "free" ? Math.min(free, FREE_CALL_MAX_SECONDS) : free + profile.credit_seconds;
    if (allowance <= 0) return deny(mode === "free" ? "free_used" : "no_credit");

    const { data: agentId } = await supabaseAdmin.rpc("assign_chat_agent", {
      _listener_id: data.listenerId,
      _client_id: userId,
    });
    if (!agentId) return deny("busy");

    const { data: session, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        client_id: userId,
        listener_id: data.listenerId,
        agent_user_id: agentId,
        mode,
        status: "ringing",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Remember the agent so the next conversation lands with the same person.
    await supabaseAdmin
      .from("client_agent_routes")
      .upsert(
        { client_id: userId, listener_id: data.listenerId, agent_user_id: agentId },
        { onConflict: "client_id,listener_id" },
      );

    return {
      ok: true as const,
      reason: null,
      sessionId: session.id,
      allowanceSeconds: allowance,
      mode,
    };
  });

/** Keeps the session alive and lets the server decide when credit runs out. */
export const chatHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { loadClientChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadClientChat(data.sessionId, userId);

    const dead = (status: string) => ({
      elapsed: 0,
      allowanceSeconds: 0,
      remaining: 0,
      shouldEnd: true,
      answered: false,
      status,
    });

    if (!session) return dead("missing");
    if (session.ended_at) return dead(session.status ?? "ended");

    await supabaseAdmin
      .from("chat_sessions")
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", session.id);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credit_seconds, free_seconds_remaining")
      .eq("id", userId)
      .maybeSingle();

    const free = profile?.free_seconds_remaining ?? 0;
    const allowance =
      session.mode === "free"
        ? Math.min(free, FREE_CALL_MAX_SECONDS)
        : free + (profile?.credit_seconds ?? 0);

    if (!session.answered_at) {
      return {
        elapsed: 0,
        allowanceSeconds: allowance,
        remaining: allowance,
        shouldEnd: false,
        answered: false,
        status: session.status ?? "ringing",
      };
    }

    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - new Date(session.answered_at).getTime()) / 1000),
    );

    return {
      elapsed,
      allowanceSeconds: allowance,
      remaining: Math.max(allowance - elapsed, 0),
      shouldEnd: elapsed >= allowance,
      answered: true,
      status: session.status ?? "active",
    };
  });

export const endChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadClientChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadClientChat(data.sessionId, context.userId);
    if (!session) return { billed: 0, cost: 0, freeLeft: 0, paidLeft: 0 };

    const { data: rows, error } = await supabaseAdmin.rpc("settle_chat", {
      _session_id: data.sessionId,
      _rate_cents: CHAT_RATE_CENTS_PER_MINUTE,
    });
    if (error) throw new Error(error.message);

    if (session.agent_user_id) {
      await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id });
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      billed: row?.billed ?? 0,
      cost: row?.cost ?? 0,
      freeLeft: row?.free_left ?? 0,
      paidLeft: row?.paid_left ?? 0,
    };
  });

/* ----------------------------------------------------------------- shared */

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        sessionId: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, client_id, agent_user_id, status, ended_at")
      .eq("id", data.sessionId)
      .maybeSingle();

    if (!session || session.ended_at || session.status !== "active") {
      return { ok: false as const, reason: "closed" };
    }

    const role =
      session.client_id === context.userId
        ? "client"
        : session.agent_user_id === context.userId
          ? "agent"
          : null;
    if (!role) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("chat_messages").insert({
      session_id: data.sessionId,
      sender_role: role,
      sender_user_id: context.userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, reason: null };
  });

export const listChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, sender_role, body, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ------------------------------------------------------------------ agent */

export const listMyChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, client_id, listener_id, status, mode, started_at, answered_at")
      .eq("agent_user_id", context.userId)
      .is("ended_at", null)
      .order("started_at", { ascending: true })
      .limit(20);

    const rows = sessions ?? [];
    if (rows.length === 0) return [];

    const [{ data: profiles }, { data: listeners }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, alias, created_at")
        .in("id", Array.from(new Set(rows.map((r) => r.client_id)))),
      supabaseAdmin
        .from("listeners")
        .select("id, display_name")
        .in("id", Array.from(new Set(rows.map((r) => r.listener_id)))),
    ]);

    const alias = new Map((profiles ?? []).map((p) => [p.id, p.alias]));
    const since = new Map((profiles ?? []).map((p) => [p.id, p.created_at]));
    const name = new Map((listeners ?? []).map((l) => [l.id, l.display_name]));

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      mode: r.mode,
      startedAt: r.started_at,
      answeredAt: r.answered_at,
      profileName: name.get(r.listener_id) ?? "Anontalk",
      clientAlias: alias.get(r.client_id) ?? "Anoniem",
      clientSince: since.get(r.client_id) ?? null,
    }));
  });

export const acceptChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");
    if (session.ended_at) return { ok: false as const };

    if (!session.answered_at) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("chat_sessions")
        .update({ answered_at: now, status: "active", last_heartbeat_at: now })
        .eq("id", data.sessionId);
    }
    return { ok: true as const };
  });

export const declineChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    await supabaseAdmin
      .from("chat_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .is("answered_at", null);

    return { ok: true as const };
  });

/** Agent hangs up the chat: settles the customer's time and frees the slot. */
export const closeChatAsAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.rpc("settle_chat", {
      _session_id: data.sessionId,
      _rate_cents: CHAT_RATE_CENTS_PER_MINUTE,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
