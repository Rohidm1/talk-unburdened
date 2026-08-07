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
    const notReady = (reason: "unconfigured" | "busy") =>
      ({ ready: false as const, reason, toIdentity: null, dialAuth: null }) as const;

    if (!twilioConfig()) return notReady("unconfigured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: links }, { data: listener }, { data: sticky }] = await Promise.all([
      supabaseAdmin.from("listener_agents").select("agent_user_id").eq("listener_id", data.listenerId),
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

    const { data: presence } = await supabaseAdmin
      .from("agent_presence")
      .select("user_id, status")
      .in("user_id", agentIds);

    const online = (presence ?? []).filter((p) => p.status === "online").map((p) => p.user_id);
    if (online.length === 0) return notReady("busy");

    const preferred = sticky?.agent_user_id;
    const toIdentity = preferred && online.includes(preferred) ? preferred : online[0]!;

    await supabaseAdmin
      .from("client_agent_routes")
      .upsert(
        { client_id: context.userId, listener_id: data.listenerId, agent_user_id: toIdentity },
        { onConflict: "client_id,listener_id" },
      );

    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const dialAuth = await signDialAuth(context.userId, toIdentity, expiresAt);
    return { ready: true as const, reason: null, toIdentity, dialAuth };
  });
