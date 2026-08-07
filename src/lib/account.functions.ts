import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, rolesRes, listenerRes, presenceRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("listeners").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("agent_presence").select("availability, status").eq("user_id", userId).maybeSingle(),
    ]);

    return {
      profile: profileRes.data,
      roles: (rolesRes.data ?? []).map((r) => r.role),
      listener: listenerRes.data,
      agentAvailability: presenceRes.data?.availability ?? "offline",
      agentStatus: presenceRes.data?.status ?? "offline",
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

export const getMyChatSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("chat_sessions")
      .select("id, started_at, ended_at, status, listener_id, messages_count")
      .eq("client_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
