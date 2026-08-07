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

    const { logChatEvent } = await import("@/lib/chat.server");
    await logChatEvent(session.id, "request_received", "client", "Nieuwe aanvraag ontvangen");

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
    const { loadClientChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadClientChat(data.sessionId, context.userId);
    if (!session) return { billed: 0, cost: 0, freeLeft: 0, paidLeft: 0 };

    const { data: rows, error } = await supabaseAdmin.rpc("settle_chat", {
      _session_id: data.sessionId,
      _rate_cents: CHAT_RATE_CENTS_PER_MINUTE,
    });
    if (error) throw new Error(error.message);

    await logChatEvent(data.sessionId, "ended", "client", "Gesprek beëindigd door klant");
    await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id });

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

    // A customer who simply closes the tab must never keep an agent occupied.
    await supabaseAdmin.rpc("settle_stale_agent_chats", {
      _agent_user_id: context.userId,
      _rate_cents: CHAT_RATE_CENTS_PER_MINUTE,
    });

    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select(
        "id, client_id, listener_id, status, mode, started_at, answered_at, ended_at, last_heartbeat_at",
      )
      .eq("agent_user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(50);

    const allRows = sessions ?? [];
    const endedIds = allRows.filter((r) => r.ended_at && r.answered_at).map((r) => r.id);
    const { data: completedNotes } = endedIds.length
      ? await supabaseAdmin
          .from("call_notes")
          .select("chat_session_id")
          .eq("listener_user_id", context.userId)
          .in("chat_session_id", endedIds)
      : { data: [] as { chat_session_id: string | null }[] };
    const logged = new Set((completedNotes ?? []).map((n) => n.chat_session_id).filter(Boolean));
    // Open conversations stay visible. An answered, ended conversation also
    // stays visible until this agent has saved its logbook entry.
    const rows = allRows
      .filter((r) => !r.ended_at || (Boolean(r.answered_at) && !logged.has(r.id)))
      .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
      .slice(0, 20);
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
      endedAt: r.ended_at,
      requiresLogbook: Boolean(r.ended_at && r.answered_at),
      /** No heartbeat for a while means the customer left the conversation. */
      clientAway: Date.parse(r.last_heartbeat_at) < Date.now() - 30000,
      profileName: name.get(r.listener_id) ?? "Anontalk",
      clientAlias: alias.get(r.client_id) ?? "Anoniem",
      clientSince: since.get(r.client_id) ?? null,
    }));
  });

export const acceptChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");
    if (session.ended_at) return { ok: false as const };

    if (!session.answered_at) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("chat_sessions")
        .update({ answered_at: now, status: "active", last_heartbeat_at: now })
        .eq("id", data.sessionId);
      await logChatEvent(data.sessionId, "accepted", "agent", "Aanvraag geaccepteerd door agent");
      await logChatEvent(data.sessionId, "connected", "system", "Verbonden");
      await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id });
    }
    return { ok: true as const };
  });

export const declineChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    await supabaseAdmin
      .from("chat_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .is("answered_at", null);

    await logChatEvent(data.sessionId, "declined", "agent", "Aanvraag geweigerd");
    await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id });

    return { ok: true as const };
  });

/** Agent hangs up the chat: settles the customer's time and frees the slot. */
export const closeChatAsAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.rpc("settle_chat", {
      _session_id: data.sessionId,
      _rate_cents: CHAT_RATE_CENTS_PER_MINUTE,
    });
    if (error) throw new Error(error.message);
    await logChatEvent(data.sessionId, "ended", "agent", "Gesprek beëindigd");
    await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id });
    return { ok: true as const };
  });

/* ------------------------------------------------------- audit & analytics */

/** The agent's own logbook for this customer: notes from chats and calls. */
export const listChatNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    const { data: rows, error } = await supabaseAdmin
      .from("call_notes")
      .select("id, body, created_at, chat_session_id, call_id")
      .eq("client_id", session.client_id)
      .eq("listener_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      source: r.chat_session_id ? ("chat" as const) : r.call_id ? ("call" as const) : ("other" as const),
      thisConversation: r.chat_session_id === data.sessionId,
    }));
  });

/** Adds one entry to the logbook for the current chat. */
export const saveChatNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ sessionId: z.string().uuid(), body: z.string().trim().min(1).max(4000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { loadAgentChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("alias")
      .eq("id", session.client_id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("call_notes").insert({
      chat_session_id: session.id,
      client_id: session.client_id,
      listener_user_id: context.userId,
      client_alias: profile?.alias ?? null,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await logChatEvent(data.sessionId, "note_added", "agent", "Notitie toegevoegd aan logboek");
    return { ok: true as const };
  });

/** Chronological trail of everything that happened in one conversation. */
export const listChatEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_events")
      .select("id, event, actor_role, detail, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Lets either side record a connection change (drop, retry, reconnect). */
export const logChatConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        sessionId: z.string().uuid(),
        event: z.enum(["interrupted", "reconnected", "connected"]),
        detail: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, client_id, agent_user_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Forbidden");
    const role =
      session.client_id === context.userId
        ? "client"
        : session.agent_user_id === context.userId
          ? "agent"
          : null;
    if (!role) throw new Error("Forbidden");
    await logChatEvent(data.sessionId, data.event, role, data.detail ?? null);
    return { ok: true as const };
  });

/**
 * Deep stats about the customer behind one chat: everything they ever did with
 * us, plus how quickly this agent tends to answer them.
 */
export const getChatClientStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    const clientId = session.client_id;

    const [{ data: chats }, { data: calls }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("chat_sessions")
        .select("id, duration_seconds, started_at")
        .eq("client_id", clientId),
      supabaseAdmin.from("calls").select("id, duration_seconds").eq("client_id", clientId),
      supabaseAdmin.from("profiles").select("alias, created_at").eq("id", clientId).maybeSingle(),
    ]);

    const sessionIds = (chats ?? []).map((c) => c.id);
    const { data: messages } = sessionIds.length
      ? await supabaseAdmin
          .from("chat_messages")
          .select("session_id, sender_role, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true })
          .limit(5000)
      : { data: [] as { session_id: string; sender_role: string; created_at: string }[] };

    const rows = messages ?? [];
    const fromClient = rows.filter((m) => m.sender_role === "client").length;
    const fromAgent = rows.length - fromClient;

    // Average time between a customer message and the first agent reply.
    const bySession = new Map<string, typeof rows>();
    for (const m of rows) {
      const list = bySession.get(m.session_id) ?? [];
      list.push(m);
      bySession.set(m.session_id, list);
    }
    const agentGaps: number[] = [];
    const clientGaps: number[] = [];
    for (const list of bySession.values()) {
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1]!;
        const cur = list[i]!;
        if (prev.sender_role === cur.sender_role) continue;
        const gap =
          (new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime()) / 1000;
        if (gap < 0 || gap > 3600) continue;
        (cur.sender_role === "agent" ? agentGaps : clientGaps).push(gap);
      }
    }
    const avg = (list: number[]) =>
      list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null;

    const chatSeconds = (chats ?? []).reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0);
    const callSeconds = (calls ?? []).reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0);

    return {
      alias: profile?.alias ?? "Anoniem",
      since: profile?.created_at ?? null,
      chatCount: chats?.length ?? 0,
      callCount: calls?.length ?? 0,
      chatSeconds,
      callSeconds,
      totalSeconds: chatSeconds + callSeconds,
      messagesFromClient: fromClient,
      messagesFromAgent: fromAgent,
      avgAgentReplySeconds: avg(agentGaps),
      avgClientReplySeconds: avg(clientGaps),
    };
  });
