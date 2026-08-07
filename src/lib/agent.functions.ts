import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { conferenceNameFor, signConferenceAuth } from "@/lib/voice.server";

const callIdInput = (input: unknown) => z.object({ callId: z.string().uuid() }).parse(input);

/**
 * Ringing calls waiting for this agent. The agent's browser no longer receives a
 * Twilio "incoming" event because calls are bridged through a conference, so the
 * database is the source of truth for who is being rung.
 */
export const pollIncomingCall = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("calls")
      .select("id, started_at")
      .eq("agent_user_id", context.userId)
      .eq("status", "ringing")
      .is("ended_at", null)
      .gte("started_at", new Date(Date.now() - 60_000).toISOString())
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { callId: data?.id ?? null };
  });

/**
 * Everything the agent needs the moment a call rings: which fictional profile
 * the caller picked, who is calling, and what was noted last time.
 */
export const getCallContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(callIdInput)
  .handler(async ({ data, context }) => {
    const { loadAgentCall, supabaseAdmin } = await import("@/lib/agent.server");
    const found = await loadAgentCall(data.callId, context.userId);
    if (!found) throw new Error("Forbidden");

    const { call, listener } = found;

    const [{ data: profile }, { count }, { data: notes }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("alias, created_at")
        .eq("id", call.client_id)
        .maybeSingle(),
      supabaseAdmin
        .from("calls")
        .select("id", { count: "exact", head: true })
        .eq("client_id", call.client_id)
        .eq("status", "ended"),
      supabaseAdmin
        .from("call_notes")
        .select("id, body, created_at")
        .eq("client_id", call.client_id)
        .eq("listener_user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const previousCalls = count ?? 0;
    return {
      callId: call.id,
      status: call.status,
      answered: Boolean(call.answered_at),
      profileName: listener?.display_name ?? "Anontalk",
      callerAlias: profile?.alias ?? "Anoniem",
      callerSince: profile?.created_at ?? null,
      previousCalls,
      returning: previousCalls > 0,
      notes: notes ?? [],
    };
  });

/** Accepting is the only moment metering (and billing) starts. */
export const answerCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(callIdInput)
  .handler(async ({ data, context }) => {
    const { loadAgentCall, supabaseAdmin } = await import("@/lib/agent.server");
    const found = await loadAgentCall(data.callId, context.userId);
    if (!found) throw new Error("Forbidden");
    if (found.call.ended_at)
      return { ok: false as const, callId: data.callId, conferenceAuth: null };

    if (!found.call.answered_at) {
      await supabaseAdmin
        .from("calls")
        .update({
          answered_at: new Date().toISOString(),
          status: "active",
          last_heartbeat_at: new Date().toISOString(),
          agent_user_id: context.userId,
        })
        .eq("id", data.callId);
    }

    await supabaseAdmin.rpc("set_agent_status", {
      _agent_user_id: context.userId,
      _status: "busy",
    });

    // Credentials to join the conference the caller is already waiting in.
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const conferenceAuth = await signConferenceAuth(
      context.userId,
      conferenceNameFor(data.callId),
      "agent",
      expiresAt,
    );

    return { ok: true as const, callId: data.callId, conferenceAuth };
  });

export const declineCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(callIdInput)
  .handler(async ({ data, context }) => {
    const { loadAgentCall, supabaseAdmin } = await import("@/lib/agent.server");
    const found = await loadAgentCall(data.callId, context.userId);
    if (!found) throw new Error("Forbidden");

    await supabaseAdmin
      .from("calls")
      .update({ status: "declined", ended_at: new Date().toISOString() })
      .eq("id", data.callId)
      .is("answered_at", null);

    return { ok: true as const };
  });

/** Called when the agent hangs up: frees the agent back to available. */
export const releaseAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("set_agent_status", {
      _agent_user_id: context.userId,
      _status: "online",
    });
    return { ok: true as const };
  });

export const saveCallNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ callId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { loadAgentCall, supabaseAdmin } = await import("@/lib/agent.server");
    const found = await loadAgentCall(data.callId, context.userId);
    if (!found) throw new Error("Forbidden");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("alias")
      .eq("id", found.call.client_id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("call_notes").insert({
      call_id: found.call.id,
      client_id: found.call.client_id,
      listener_user_id: context.userId,
      client_alias: profile?.alias ?? null,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });