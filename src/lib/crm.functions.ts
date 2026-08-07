import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { usernameToEmail } from "@/lib/crm-username";

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { requireAdminClient } = await import("@/lib/crm.server");
    const admin = requireAdminClient(Boolean(isAdmin));

    const [{ data: listeners }, { data: roles }, usersRes, { data: links }, { data: presence }] =
      await Promise.all([
        admin.from("listeners").select("*").order("sort_order", { ascending: true }),
        admin.from("user_roles").select("user_id, role"),
        admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
        admin.from("listener_agents").select("listener_id, agent_user_id"),
        admin.from("agent_presence").select("user_id, status"),
      ]);

    const emailByUser = new Map<string, string>();
    for (const u of usersRes.data?.users ?? []) emailByUser.set(u.id, u.email ?? "");
    const statusByUser = new Map<string, string>();
    for (const p of presence ?? []) statusByUser.set(p.user_id, p.status);
    const staffIds = (roles ?? []).filter((r) => r.role === "staff").map((r) => r.user_id);

    return {
      listeners: (listeners ?? []).map((l) => ({
        ...l,
        login: l.user_id ? (emailByUser.get(l.user_id)?.split("@")[0] ?? null) : null,
        agentIds: (links ?? []).filter((x) => x.listener_id === l.id).map((x) => x.agent_user_id),
      })),
      agents: staffIds.map((id) => ({
        userId: id,
        username: emailByUser.get(id)?.split("@")[0] ?? id.slice(0, 8),
        status: statusByUser.get(id) ?? "offline",
      })),
      staffCount: staffIds.length,
    };
  });

/** Assign the real agents that can take calls for one fictional profile. */
export const setListenerAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        listenerId: z.string().uuid(),
        agentUserIds: z.array(z.string().uuid()).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { requireAdminClient } = await import("@/lib/crm.server");
    const admin = requireAdminClient(Boolean(isAdmin));

    await admin.from("listener_agents").delete().eq("listener_id", data.listenerId);
    if (data.agentUserIds.length > 0) {
      const { error } = await admin.from("listener_agents").insert(
        data.agentUserIds.map((agent_user_id) => ({
          listener_id: data.listenerId,
          agent_user_id,
        })),
      );
      if (error) throw new Error(error.message);
    }

    // Keep the legacy single-owner column and the card status in sync.
    await admin
      .from("listeners")
      .update({ user_id: data.agentUserIds[0] ?? null })
      .eq("id", data.listenerId);
    await admin.rpc("sync_listener_status", { _listener_id: data.listenerId });

    return { ok: true };
  });

export const createWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .min(3)
          .max(32)
          .regex(/^[a-zA-Z0-9._-]+$/),
        password: z.string().min(8).max(72),
        displayName: z.string().trim().min(2).max(40),
        avatarKey: z.string().trim().min(1).max(40),
        bioEn: z.string().trim().min(1).max(500),
        bioNl: z.string().trim().min(1).max(500),
        languages: z.array(z.string().trim().min(1).max(20)).max(6),
        topicsEn: z.array(z.string().trim().min(1).max(40)).max(10),
        topicsNl: z.array(z.string().trim().min(1).max(40)).max(10),
        years: z.number().int().min(0).max(60),
        existingListenerId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { requireAdminClient } = await import("@/lib/crm.server");
    const admin = requireAdminClient(Boolean(isAdmin));
    const email = usernameToEmail(data.username);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { alias: data.displayName },
    });
    if (createError || !created.user)
      throw new Error(createError?.message ?? "Could not create login");

    const userId = created.user.id;
    await admin.from("user_roles").insert({ user_id: userId, role: "staff" });

    if (data.existingListenerId) {
      const { error } = await admin
        .from("listeners")
        .update({ user_id: userId, display_name: data.displayName, is_active: true })
        .eq("id", data.existingListenerId);
      if (error) throw new Error(error.message);
      await admin
        .from("listener_agents")
        .insert({ listener_id: data.existingListenerId, agent_user_id: userId });
    } else {
      const { data: inserted, error } = await admin
        .from("listeners")
        .insert({
          user_id: userId,
          display_name: data.displayName,
          avatar_key: data.avatarKey,
          bio_en: data.bioEn,
          bio_nl: data.bioNl,
          languages: data.languages,
          topics_en: data.topicsEn,
          topics_nl: data.topicsNl,
          years: data.years,
          status: "offline",
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await admin
        .from("listener_agents")
        .insert({ listener_id: inserted.id, agent_user_id: userId });
    }

    await admin.rpc("set_agent_status", { _agent_user_id: userId, _status: "offline" });

    return { ok: true, username: data.username };
  });

export const resetWorkerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { requireAdminClient } = await import("@/lib/crm.server");
    const admin = requireAdminClient(Boolean(isAdmin));
    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setListenerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ listenerId: z.string().uuid(), isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { requireAdminClient } = await import("@/lib/crm.server");
    const admin = requireAdminClient(Boolean(isAdmin));
    const { error } = await admin
      .from("listeners")
      .update({ is_active: data.isActive })
      .eq("id", data.listenerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });

/**
 * Minimal agent account: a login + screen name only.
 * It never creates or renames a fictional profile — linking is separate.
 */
export const createAgentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .min(3)
          .max(32)
          .regex(/^[a-zA-Z0-9._-]+$/),
        password: z.string().min(8).max(72),
        displayName: z.string().trim().min(2).max(40),
        listenerIds: z.array(z.string().uuid()).max(50).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { requireAdminClient } = await import("@/lib/crm.server");
    const admin = requireAdminClient(Boolean(isAdmin));

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { alias: data.displayName },
    });
    if (createError || !created.user)
      throw new Error(createError?.message ?? "Could not create login");

    const userId = created.user.id;
    await admin.from("user_roles").insert({ user_id: userId, role: "staff" });

    if (data.listenerIds.length > 0) {
      const { error } = await admin
        .from("listener_agents")
        .insert(data.listenerIds.map((listener_id) => ({ listener_id, agent_user_id: userId })));
      if (error) throw new Error(error.message);
    }

    await admin.rpc("set_agent_status", { _agent_user_id: userId, _status: "offline" });
    for (const listenerId of data.listenerIds) {
      await admin.rpc("sync_listener_status", { _listener_id: listenerId });
    }

    return { ok: true, userId, username: data.username };
  });

/** Link/unlink one agent to one fictional profile without touching other agents. */
export const setAgentListener = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        agentUserId: z.string().uuid(),
        listenerId: z.string().uuid(),
        linked: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { requireAdminClient } = await import("@/lib/crm.server");
    const admin = requireAdminClient(Boolean(isAdmin));

    if (data.linked) {
      const { data: existing } = await admin
        .from("listener_agents")
        .select("id")
        .eq("listener_id", data.listenerId)
        .eq("agent_user_id", data.agentUserId)
        .maybeSingle();
      if (!existing) {
        const { error } = await admin
          .from("listener_agents")
          .insert({ listener_id: data.listenerId, agent_user_id: data.agentUserId });
        if (error) throw new Error(error.message);
      }
    } else {
      await admin
        .from("listener_agents")
        .delete()
        .eq("listener_id", data.listenerId)
        .eq("agent_user_id", data.agentUserId);
    }

    await admin.rpc("sync_listener_status", { _listener_id: data.listenerId });
    return { ok: true };
  });
