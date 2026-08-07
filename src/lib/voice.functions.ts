import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAccessToken, signDialAuth, twilioConfig } from "@/lib/voice.server";

export const getVoiceToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = await createAccessToken(context.userId);
    return { token, identity: context.userId, configured: !!token };
  });

/**
 * Picks the real agent that should take this call.
 *
 * Sticky routing: the agent a caller already spoke to through this profile is
 * preferred. If that agent is not available we fall back to any other agent
 * assigned to the same profile, and otherwise report the profile as busy.
 */
export const prepareDial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ listenerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const notReady = (reason: "unconfigured" | "busy", waitingAhead = 0) =>
      ({ ready: false as const, reason, toIdentity: null, dialAuth: null, waitingAhead }) as const;

    if (!twilioConfig()) return notReady("unconfigured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: links }, { data: listener }, { data: sticky }] = await Promise.all([
      supabaseAdmin
        .from("listener_agents")
        .select("agent_user_id")
        .eq("listener_id", data.listenerId),
      supabaseAdmin.from("listeners").select("user_id").eq("id", data.listenerId).maybeSingle(),
      supabaseAdmin
        .from("client_agent_routes")
        .select("agent_user_id")
        .eq("client_id", context.userId)
        .eq("listener_id", data.listenerId)
        .maybeSingle(),
    ]);

    const agentIds = Array.from(
      new Set([
        ...(links ?? []).map((l) => l.agent_user_id),
        ...(listener?.user_id ? [listener.user_id] : []),
      ]),
    );
    if (agentIds.length === 0) return notReady("busy");

    // Everyone who is signed in and available right now, plus everyone who is
    // already occupied by a live call or chat (through ANY profile).
    // Only conversations with a live heartbeat count as "occupied"; abandoned
    // rows that were never settled must not keep a profile busy forever.
    const liveSince = new Date(Date.now() - 45_000).toISOString();
    const [{ data: presence }, { data: liveCalls }, { data: liveChats }] = await Promise.all([
      supabaseAdmin.from("agent_presence").select("user_id, status, active_chat_count"),
      supabaseAdmin
        .from("calls")
        .select("agent_user_id")
        .is("ended_at", null)
        .gt("last_heartbeat_at", liveSince),
      supabaseAdmin
        .from("chat_sessions")
        .select("agent_user_id")
        .is("ended_at", null)
        .gt("last_heartbeat_at", liveSince),
    ]);

    const busy = new Set<string>();
    for (const c of liveCalls ?? []) if (c.agent_user_id) busy.add(c.agent_user_id);
    for (const c of liveChats ?? []) if (c.agent_user_id) busy.add(c.agent_user_id);

    const onlineAll = (presence ?? [])
      .filter((p) => p.status === "online")
      .map((p) => p.user_id);

    // 1) agents of this profile, 2) any other free agent (smart hand-off).
    const own = onlineAll.filter((id) => agentIds.includes(id) && !busy.has(id));
    const others = onlineAll.filter((id) => !agentIds.includes(id) && !busy.has(id));
    const pool = own.length > 0 ? own : others;

    if (pool.length === 0) {
      const waitingAhead = onlineAll.filter((id) => busy.has(id)).length;
      return notReady("busy", waitingAhead);
    }

    const preferred = sticky?.agent_user_id;
    const toIdentity = preferred && pool.includes(preferred) ? preferred : pool[0]!;

    await supabaseAdmin
      .from("client_agent_routes")
      .upsert(
        { client_id: context.userId, listener_id: data.listenerId, agent_user_id: toIdentity },
        { onConflict: "client_id,listener_id" },
      );

    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const dialAuth = await signDialAuth(context.userId, toIdentity, expiresAt);
    return { ready: true as const, reason: null, toIdentity, dialAuth, waitingAhead: 0 };
  });
