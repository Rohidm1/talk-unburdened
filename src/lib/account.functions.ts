import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const RATE_CENTS_PER_MINUTE = 130;

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, rolesRes, listenerRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("listeners").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    return {
      profile: profileRes.data,
      roles: (rolesRes.data ?? []).map((r) => r.role),
      listener: listenerRes.data,
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
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("credit_seconds")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || profile.credit_seconds <= 0) {
      return { ok: false as const, reason: "no_credit" as const, callId: null, balance: 0 };
    }

    const { data: call, error } = await supabase
      .from("calls")
      .insert({ client_id: userId, listener_id: data.listenerId })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return {
      ok: true as const,
      reason: null,
      callId: call.id,
      balance: profile.credit_seconds,
    };
  });

export const endCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ callId: z.string().uuid(), durationSeconds: z.number().int().min(0).max(36000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("credit_seconds")
      .eq("id", userId)
      .maybeSingle();

    const balance = profile?.credit_seconds ?? 0;
    const billed = Math.min(data.durationSeconds, balance);
    const cost = Math.round((billed / 60) * RATE_CENTS_PER_MINUTE);

    await supabase
      .from("calls")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: data.durationSeconds,
        billed_seconds: billed,
        cost_cents: cost,
      })
      .eq("id", data.callId)
      .eq("client_id", userId);

    const remaining = Math.max(balance - billed, 0);
    await supabase.from("profiles").update({ credit_seconds: remaining }).eq("id", userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      seconds_delta: -billed,
      amount_cents: cost,
      kind: "usage",
    });

    return { billed, cost, remaining };
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
