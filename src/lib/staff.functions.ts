import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const setMyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ availability: z.enum(["available", "break", "offline"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("set_agent_availability", {
      _agent_user_id: context.userId,
      _availability: data.availability,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("call_notes")
      .select("id, body, client_alias, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const addNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ body: z.string().min(1).max(2000), clientAlias: z.string().max(60).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("call_notes").insert({
      listener_user_id: context.userId,
      body: data.body,
      client_alias: data.clientAlias ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, chats, listeners, transactions] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("chat_sessions").select("id, started_at, ended_at"),
      supabaseAdmin.from("listeners").select("id, display_name, status"),
      supabaseAdmin.from("credit_transactions").select("amount_cents, credits_delta, kind"),
    ]);

    const rows = transactions.data ?? [];
    const revenueCents = rows
      .filter((r) => r.kind === "purchase")
      .reduce((sum, r) => sum + r.amount_cents, 0);
    const messagesSent = rows
      .filter((r) => (r.credits_delta ?? 0) < 0)
      .reduce((sum, r) => sum + Math.abs(r.credits_delta ?? 0), 0);

    return {
      totalUsers: users.count ?? 0,
      totalChats: (chats.data ?? []).length,
      messagesSent,
      revenueCents,
      listeners: listeners.data ?? [],
    };
  });
