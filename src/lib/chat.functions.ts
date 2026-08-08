import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_TRIAL_MESSAGES, LOW_BALANCE_WARNING_CREDITS } from "@/lib/credit-packages";

const sessionInput = (input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input);

/* ------------------------------------------------------------------ client */

export const startChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ listenerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.rpc("expire_stale_chats");

    const deny = (reason: "blocked" | "no_credit" | "free_used" | "busy") =>
      ({ ok: false as const, reason, sessionId: null, allowance: 0, mode: "paid" }) as const;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("chat_credits, free_credits, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) return deny("no_credit");
    if (profile.is_blocked) return deny("blocked");

    const mode: "paid" | "free" = profile.chat_credits > 0 ? "paid" : "free";
    const allowance =
      mode === "free"
        ? Math.min(profile.free_credits, FREE_TRIAL_MESSAGES)
        : profile.chat_credits + profile.free_credits;
    if (allowance <= 0) return deny(mode === "free" ? "free_used" : "no_credit");

    const { data: agentId } = await supabaseAdmin.rpc("assign_chat_agent", {
      _listener_id: data.listenerId,
      _client_id: userId,
    });
    const { data: session, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        client_id: userId,
        listener_id: data.listenerId,
        agent_user_id: agentId ?? null,
        mode,
        status: agentId ? "ringing" : "queued",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (agentId) {
      await supabaseAdmin
        .from("client_agent_routes")
        .upsert(
          { client_id: userId, listener_id: data.listenerId, agent_user_id: agentId },
          { onConflict: "client_id,listener_id" },
        );
    }

    const { logChatEvent } = await import("@/lib/chat.server");
    await logChatEvent(session.id, "request_received", "client", "Nieuwe aanvraag ontvangen");

    return {
      ok: true as const,
      reason: null,
      sessionId: session.id,
      allowance,
      mode,
    };
  });

export const endChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadClientChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadClientChat(data.sessionId, context.userId);
    if (!session) return { billed: 0, freeLeft: 0, paidLeft: 0 };

    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .is("ended_at", null);
    if (error) throw new Error(error.message);

    await logChatEvent(data.sessionId, "ended", "client", "Gesprek beëindigd door klant");
    await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id ?? "" });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("chat_credits, free_credits")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      billed: 0,
      freeLeft: profile?.free_credits ?? 0,
      paidLeft: profile?.chat_credits ?? 0,
    };
  });

/** Keeps the session alive and reports remaining credit. */
export const chatHeartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { loadClientChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadClientChat(data.sessionId, userId);

    const dead = (status: string) => ({
      allowance: 0,
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
      .select("chat_credits, free_credits")
      .eq("id", userId)
      .maybeSingle();

    const total = (profile?.chat_credits ?? 0) + (profile?.free_credits ?? 0);
    const remaining = session.answered_at ? total : Math.max(total, 0);

    return {
      allowance: total,
      remaining,
      shouldEnd: remaining <= 0,
      answered: !!session.answered_at,
      status: session.status ?? "ringing",
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

    const openStatuses = ["ringing", "queued", "active"];
    if (!session || session.ended_at || !openStatuses.includes(session.status ?? "")) {
      return { ok: false as const, reason: "closed" };
    }

    const role =
      session.client_id === context.userId
        ? "client"
        : session.agent_user_id === context.userId
          ? "agent"
          : null;
    if (!role) return { ok: false as const, reason: "forbidden" };

    // Nothing is charged until a chat partner has actually joined the chat.
    if (role === "client" && session.status === "active") {
      const { data: spent } = await supabaseAdmin.rpc("spend_chat_credit", {
        _user_id: context.userId,
        _session_id: data.sessionId,
      });
      const row = Array.isArray(spent) ? spent[0] : spent;
      if (!row?.ok) return { ok: false as const, reason: "no_credit" };
    }

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

    const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!isStaff && !isAdmin) throw new Error("Forbidden");

    await supabaseAdmin.rpc("expire_stale_chats");

    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select(
        "id, client_id, listener_id, status, mode, started_at, answered_at, ended_at, last_heartbeat_at",
      )
      .or(`agent_user_id.eq.${context.userId},agent_user_id.is.null`)
      .order("started_at", { ascending: false })
      .limit(50);

    const allRows = sessions ?? [];
    const endedIds = allRows
      .filter((r) => r.ended_at && r.answered_at)
      .map((r) => r.id)
      .filter((id): id is string => Boolean(id));
    const { data: completedNotes } = endedIds.length
      ? await supabaseAdmin
          .from("call_notes")
          .select("chat_session_id, created_at")
          .eq("listener_user_id", context.userId)
          .in("chat_session_id", endedIds as string[])
      : { data: [] as { chat_session_id: string | null; created_at: string }[] };
    const endedAt = new Map(
      allRows.filter((r) => r.ended_at).map((r) => [r.id, Date.parse(r.ended_at ?? "")]),
    );
    const logged = new Set(
      (completedNotes ?? [])
        .filter((n) => {
          const closedAt = n.chat_session_id ? endedAt.get(n.chat_session_id) : undefined;
          return closedAt != null && Date.parse(n.created_at) >= closedAt;
        })
        .map((n) => n.chat_session_id)
        .filter(Boolean),
    );
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
        .in(
          "id",
          Array.from(
            new Set(rows.map((r) => r.listener_id).filter((id): id is string => Boolean(id))),
          ),
        ),
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
      clientAway: Date.parse(r.last_heartbeat_at) < Date.now() - 30000,
      profileName: name.get(r.listener_id ?? "") ?? "Anontalk",
      clientAlias: alias.get(r.client_id ?? "") ?? "Anoniem",
      clientSince: since.get(r.client_id ?? "") ?? null,
    }));
  });

export const claimNextChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("expire_stale_chats");
    const { data: sessionId } = await supabaseAdmin.rpc("claim_next_chat", {
      _agent_user_id: context.userId,
    });
    if (!sessionId) return { sessionId: null };
    return { sessionId };
  });

export const acceptChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!isStaff && !isAdmin) throw new Error("Forbidden");

    let session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) {
      const { data: claimed } = await supabaseAdmin
        .from("chat_sessions")
        .update({ agent_user_id: context.userId })
        .eq("id", data.sessionId)
        .is("agent_user_id", null)
        .is("ended_at", null)
        .select("id")
        .maybeSingle();
      if (claimed) session = await loadAgentChat(data.sessionId, context.userId);
    }
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
      await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id ?? "" });
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
    await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id ?? "" });

    return { ok: true as const };
  });

export const closeChatAsAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, logChatEvent, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    await supabaseAdmin
      .from("chat_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.sessionId);
    await logChatEvent(data.sessionId, "ended", "agent", "Gesprek beëindigd");
    await supabaseAdmin.rpc("sync_listener_status", { _listener_id: session.listener_id ?? "" });
    return { ok: true as const };
  });

/* ------------------------------------------------------- audit & analytics */

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
      source: r.chat_session_id
        ? ("chat" as const)
        : r.call_id
          ? ("call" as const)
          : ("other" as const),
      thisConversation: r.chat_session_id === data.sessionId,
    }));
  });

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

    const { data: inserted, error } = await supabaseAdmin
      .from("call_notes")
      .insert({
        chat_session_id: session.id,
        client_id: session.client_id,
        listener_user_id: context.userId,
        client_alias: profile?.alias ?? null,
        body: data.body,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    const { data: verified, error: verifyError } = await supabaseAdmin
      .from("call_notes")
      .select("id, created_at")
      .eq("id", inserted.id)
      .maybeSingle();
    if (verifyError) throw new Error(verifyError.message);
    if (!verified) throw new Error("Notitie kon niet worden bevestigd");

    await logChatEvent(data.sessionId, "note_added", "agent", "Notitie toegevoegd aan logboek");
    return { ok: true as const, noteId: verified.id, createdAt: verified.created_at };
  });

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

export const getChatClientStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { loadAgentChat, supabaseAdmin } = await import("@/lib/chat.server");
    const session = await loadAgentChat(data.sessionId, context.userId);
    if (!session) throw new Error("Forbidden");

    const { data: allSessions } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, started_at, ended_at")
      .eq("client_id", session.client_id)
      .eq("agent_user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(100);

    const { data: allMessages } = await supabaseAdmin
      .from("chat_messages")
      .select("sender_role, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });

    const { data: allNotes } = await supabaseAdmin
      .from("call_notes")
      .select("body, created_at")
      .eq("client_id", session.client_id)
      .eq("listener_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("created_at")
      .eq("id", session.client_id)
      .maybeSingle();

    const sessions = allSessions ?? [];
    let totalSeconds = 0;
    for (const s of sessions) {
      if (!s.ended_at) continue;
      const diff = Date.parse(s.ended_at) - Date.parse(s.started_at);
      if (diff > 0) totalSeconds += diff / 1000;
    }

    const messages = allMessages ?? [];
    const messagesFromClient = messages.filter((m) => m.sender_role === "client").length;
    const messagesFromAgent = messages.filter((m) => m.sender_role === "agent").length;

    function avgReplySeconds(role: "agent" | "client") {
      const deltas: number[] = [];
      let lastOpposite: Date | null = null;
      for (const m of messages) {
        if (m.sender_role === role) {
          if (lastOpposite) {
            const delta = Date.parse(m.created_at) - lastOpposite.getTime();
            if (delta > 0) deltas.push(delta / 1000);
          }
        } else {
          lastOpposite = new Date(m.created_at);
        }
      }
      if (deltas.length === 0) return null;
      return Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
    }

    return {
      totalSeconds,
      chatCount: sessions.length,
      callCount: 0,
      since: profile?.created_at ?? null,
      messagesFromClient,
      messagesFromAgent,
      avgAgentReplySeconds: avgReplySeconds("agent"),
      avgClientReplySeconds: avgReplySeconds("client"),
      notes: (allNotes ?? []).map((n) => ({ body: n.body, createdAt: n.created_at })),
    };
  });

export const lowBalanceCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("chat_credits, free_credits")
      .eq("id", context.userId)
      .maybeSingle();
    const total = (profile?.chat_credits ?? 0) + (profile?.free_credits ?? 0);
    return { low: total <= LOW_BALANCE_WARNING_CREDITS, total };
  });
