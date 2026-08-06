import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { usernameToEmail } from "@/lib/crm-username";

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/crm.server");
    const admin = await assertAdmin(context);

    const [{ data: listeners }, { data: roles }, usersRes] = await Promise.all([
      admin.from("listeners").select("*").order("sort_order", { ascending: true }),
      admin.from("user_roles").select("user_id, role"),
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const emailByUser = new Map<string, string>();
    for (const u of usersRes.data?.users ?? []) emailByUser.set(u.id, u.email ?? "");

    return {
      listeners: (listeners ?? []).map((l) => ({
        ...l,
        login: l.user_id ? (emailByUser.get(l.user_id)?.split("@")[0] ?? null) : null,
      })),
      staffCount: (roles ?? []).filter((r) => r.role === "staff").length,
    };
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
    const { assertAdmin } = await import("@/lib/crm.server");
    const admin = await assertAdmin(context);
    const email = usernameToEmail(data.username);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { alias: data.displayName },
    });
    if (createError || !created.user) throw new Error(createError?.message ?? "Could not create login");

    const userId = created.user.id;
    await admin.from("user_roles").insert({ user_id: userId, role: "staff" });

    if (data.existingListenerId) {
      const { error } = await admin
        .from("listeners")
        .update({ user_id: userId, display_name: data.displayName, is_active: true })
        .eq("id", data.existingListenerId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("listeners").insert({
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
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true, username: data.username };
  });

export const resetWorkerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/crm.server");
    const admin = await assertAdmin(context);
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
    const { assertAdmin } = await import("@/lib/crm.server");
    const admin = await assertAdmin(context);
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
