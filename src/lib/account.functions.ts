import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_CALL_MAX_SECONDS, RATE_CENTS_PER_MINUTE } from "@/lib/credit-packages";

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, rolesRes, listenerRes, presenceRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("listeners").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("agent_presence").select("status").eq("user_id", userId).maybeSingle(),
    ]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: links } = await supabaseAdmin
      .from("listener_agents")
      .select("listener_id, listeners(id, display_name, avatar_key, is_active)")
      .eq("agent_user_id", userId);

    return {
      profile: profileRes.data,
      roles: (rolesRes.data ?? []).map((r) => r.role),
      listener: listenerRes.data,
      agentStatus: presenceRes.data?.status ?? "offline",
      myProfiles: (links ?? [])
        .map((l) => l.listeners)
        .filter((l): l is NonNullable<typeof l> => Boolean(l)),
    };
  });

export const updateAlias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ alias: z.string().min(2).max(24) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ alias: data.alias })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ listenerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Close out anything left open by a browser that vanished mid-call.
    await supabaseAdmin.rpc("settle_stale_calls", {
      _user_id: userId,
      _rate_cents: RATE_CENTS_PER_MINUTE,
    });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credit_seconds, free_seconds_remaining, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    const deny = (reason: "blocked" | "no_credit" | "free_used") =>
      ({ ok: false as const, reason, callId: null, allowanceSeconds: 0, mode: "paid" }) as const;

    if (!profile) return deny("no_credit");
    if (profile.is_blocked) return deny("blocked");

    // A caller with no paid credit is on their one-time free minutes; anyone
    // with credit is billed normally (free seconds are spent first).
    const free = profile.free_seconds_remaining;
    const mode: "paid" | "free" = profile.credit_seconds <= 0 ? "free" : "paid";
    const allowance =
      mode === "free" ? Math.min(free, FREE_CALL_MAX_SECONDS) : free + profile.credit_seconds;

    if (allowance <= 0) return deny(mode === "free" ? "free_used" : "no_credit");

    const { data: call, error } = await supabaseAdmin
      .from("calls")
      .insert({ client_id: userId, listener_id: data.listenerId, mode })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return {
      ok: true as const,
      reason: null,
      callId: call.id,
      allowanceSeconds: allowance,
      mode,
    };
  });

/**
 * Called every few seconds while a call is live. The server clock — not the
 * browser — decides how long the call has run and when it must stop.
 */
export const heartbeatCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: call } = await supabaseAdmin
      .from("calls")
      .select("id, started_at, answered_at, ended_at, mode, status")
      .eq("id", data.callId)
      .eq("client_id", userId)
      .maybeSingle();

    const dead = (status: string) => ({
      elapsed: 0,
      allowanceSeconds: 0,
      remaining: 0,
      shouldEnd: true,
      answered: false,
      status,
    });

    if (!call) return dead("missing");
    if (call.ended_at) return dead(call.status ?? "ended");

    await supabaseAdmin
      .from("calls")
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", call.id);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credit_seconds, free_seconds_remaining")
      .eq("id", userId)
      .maybeSingle();

    const free = profile?.free_seconds_remaining ?? 0;
    const allowance =
      call.mode === "free"
        ? Math.min(free, FREE_CALL_MAX_SECONDS)
        : free + (profile?.credit_seconds ?? 0);

    // Nothing is metered while the line is still ringing.
    if (!call.answered_at) {
      return {
        elapsed: 0,
        allowanceSeconds: allowance,
        remaining: allowance,
        shouldEnd: false,
        answered: false,
        status: call.status ?? "ringing",
      };
    }

    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - new Date(call.answered_at).getTime()) / 1000),
    );

    return {
      elapsed,
      allowanceSeconds: allowance,
      remaining: Math.max(allowance - elapsed, 0),
      shouldEnd: elapsed >= allowance,
      answered: true,
      status: call.status ?? "active",
    };
  });

export const endCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ownership check — settle_call itself is keyed only on the call id.
    const { data: call } = await supabaseAdmin
      .from("calls")
      .select("id")
      .eq("id", data.callId)
      .eq("client_id", userId)
      .maybeSingle();

    if (!call) return { billed: 0, cost: 0, freeLeft: 0, paidLeft: 0 };

    const { data: rows, error } = await supabaseAdmin.rpc("settle_call", {
      _call_id: data.callId,
      _rate_cents: RATE_CENTS_PER_MINUTE,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      billed: row?.billed ?? 0,
      cost: row?.cost ?? 0,
      freeLeft: row?.free_left ?? 0,
      paidLeft: row?.paid_left ?? 0,
    };
  });

export const getMyCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("calls")
      .select("id, started_at, duration_seconds, billed_seconds, cost_cents, listener_id")
      .order("started_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
