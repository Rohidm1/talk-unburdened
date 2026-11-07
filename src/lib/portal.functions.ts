import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { usernameToEmail } from "@/lib/crm-username";
import { periodStart, type Period } from "@/lib/portal-rules";

type Ctx = { supabase: any; userId: string };

async function rolesOf(context: Ctx) {
  const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  return { isStaff: Boolean(isStaff), isAdmin: Boolean(isAdmin) };
}

async function adminClient(context: Ctx) {
  const { isAdmin } = await rolesOf(context);
  if (!isAdmin) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const usernameOf = (email: string | null | undefined, fallback: string): string =>
  email?.split("@")[0] || fallback;

/** Who is signed in to the portal and what they may see. */
export const getPortalMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await rolesOf(context);
    if (!roles.isStaff && !roles.isAdmin) throw new Error("Forbidden");
    const { data: presence } = await context.supabase
      .from("agent_presence")
      .select("availability")
      .eq("user_id", context.userId)
      .maybeSingle();
    const email = (context as unknown as { claims?: { email?: string } }).claims?.email;
    return {
      userId: context.userId,
      username: usernameOf(email, "team"),
      role: roles.isAdmin ? ("admin" as const) : ("agent" as const),
      availability: (presence?.availability ?? "offline") as "available" | "break" | "offline",
    };
  });

/** Admin analytics for one period: day, week or month. */
export const getPortalAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { period: Period }) =>
    z.object({ period: z.enum(["day", "week", "month"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context);
    const since = periodStart(data.period, new Date()).toISOString();

    const [incoming, visits, signups, roles, users, presence, shifts, agentMsgs] =
      await Promise.all([
        admin
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_role", "client")
          .gte("created_at", since),
        admin
          .from("site_visits")
          .select("visitor_id, country")
          .gte("created_at", since)
          .limit(50000),
        admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since),
        admin.from("user_roles").select("user_id, role").eq("role", "staff"),
        admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
        admin
          .from("agent_presence")
          .select("user_id, availability, last_seen_at, active_chat_count"),
        admin
          .from("agent_shift_events")
          .select("agent_user_id, availability, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        admin
          .from("chat_messages")
          .select("sender_user_id")
          .eq("sender_role", "agent")
          .gte("created_at", since)
          .limit(50000),
      ]);

    const visitors = new Set(
      (visits.data ?? []).filter((v) => v.country !== "GR").map((v) => v.visitor_id),
    );
    const emailById = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const presenceById = new Map((presence.data ?? []).map((p) => [p.user_id, p]));
    const lastChange = new Map<string, string>();
    for (const s of shifts.data ?? []) {
      if (!lastChange.has(s.agent_user_id)) lastChange.set(s.agent_user_id, s.created_at);
    }
    const msgCount = new Map<string, number>();
    for (const m of agentMsgs.data ?? []) {
      if (m.sender_user_id) msgCount.set(m.sender_user_id, (msgCount.get(m.sender_user_id) ?? 0) + 1);
    }

    const agents = (roles.data ?? [])
      .map((r) => {
        const p = presenceById.get(r.user_id);
        const fresh = p ? Date.now() - Date.parse(p.last_seen_at) < 60_000 : false;
        const status = !p || p.availability === "offline" || !fresh ? "offline" : p.availability;
        return {
          userId: r.user_id,
          username: usernameOf(emailById.get(r.user_id), r.user_id.slice(0, 8)),
          status: status as "available" | "break" | "offline",
          lastStatusChange: lastChange.get(r.user_id) ?? null,
          activeChats: p?.active_chat_count ?? 0,
          messages: msgCount.get(r.user_id) ?? 0,
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));

    return {
      period: data.period,
      since,
      incomingMessages: incoming.count ?? 0,
      visitors: visitors.size,
      registrations: signups.count ?? 0,
      onlineAgents: agents.filter((a) => a.status === "available").length,
      agents,
    };
  });

/* --------------------------------------------------------- announcements */

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("staff_announcements")
      .select("id, title, body, author_name, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const postAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(4000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context);
    const email = (context as unknown as { claims?: { email?: string } }).claims?.email;
    const { error } = await admin.from("staff_announcements").insert({
      title: data.title,
      body: data.body,
      author_id: context.userId,
      author_name: `Admin (${usernameOf(email, "admin")})`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context);
    await admin.from("staff_announcements").delete().eq("id", data.id);
    return { ok: true };
  });

/* ------------------------------------------------------------- accounts */

export const listTeamAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await adminClient(context);
    const [{ data: roles }, users] = await Promise.all([
      admin.from("user_roles").select("user_id, role").in("role", ["staff", "admin"]),
      admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);
    const emailById = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const byUser = new Map<string, Set<string>>();
    for (const r of roles ?? []) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Set());
      byUser.get(r.user_id)!.add(r.role);
    }
    return Array.from(byUser.entries())
      .map(([userId, set]) => ({
        userId,
        username: usernameOf(emailById.get(userId), userId.slice(0, 8)),
        role: set.has("admin") ? ("admin" as const) : ("agent" as const),
        isMe: userId === context.userId,
      }))
      .sort((a, b) => a.role.localeCompare(b.role) || a.username.localeCompare(b.username));
  });

export const createTeamAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/),
        password: z.string().min(10).max(72),
        role: z.enum(["agent", "admin"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { alias: data.username },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    const userId = created.user.id;
    const rows: { user_id: string; role: "staff" | "admin" }[] = [{ user_id: userId, role: "staff" }];
    if (data.role === "admin") rows.push({ user_id: userId, role: "admin" });
    const { error: roleError } = await admin.from("user_roles").insert(rows);
    if (roleError) throw new Error(roleError.message);
    await admin.rpc("set_agent_availability", { _agent_user_id: userId, _availability: "offline" });
    return { ok: true, username: data.username };
  });

export const resetTeamPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(10).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context);
    const { data: isTeam } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .in("role", ["staff", "admin"]);
    if (!isTeam || isTeam.length === 0) throw new Error("Not a team account");
    const { error } = await admin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------ live monitoring */

async function describeSessions(admin: any, sessions: any[]) {
  if (sessions.length === 0) return [];
  const clientIds = Array.from(new Set(sessions.map((s) => s.client_id)));
  const listenerIds = Array.from(new Set(sessions.map((s) => s.listener_id).filter(Boolean)));
  const agentIds = Array.from(new Set(sessions.map((s) => s.agent_user_id).filter(Boolean)));
  const [{ data: profiles }, { data: listeners }, users] = await Promise.all([
    admin.from("profiles").select("id, alias").in("id", clientIds),
    listenerIds.length
      ? admin.from("listeners").select("id, display_name").in("id", listenerIds)
      : { data: [] },
    agentIds.length ? admin.auth.admin.listUsers({ page: 1, perPage: 500 }) : { data: { users: [] } },
  ]);
  const alias = new Map((profiles ?? []).map((p: any) => [p.id, p.alias]));
  const name = new Map((listeners ?? []).map((l: any) => [l.id, l.display_name]));
  const email = new Map((users.data?.users ?? []).map((u: any) => [u.id, u.email]));
  return sessions.map((s) => ({
    id: s.id as string,
    status: s.status as string,
    startedAt: s.started_at as string,
    endedAt: (s.ended_at ?? null) as string | null,
    customer: (alias.get(s.client_id) ?? "Anonymous") as string,
    profileName: (name.get(s.listener_id) ?? "Chat partner") as string,
    agentUserId: (s.agent_user_id ?? null) as string | null,
    agent: s.agent_user_id ? usernameOf(email.get(s.agent_user_id) as string, "agent") : "Waiting",
  }));
}

/** Every open conversation, across all agents. */
export const listLiveChatsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await adminClient(context);
    await admin.rpc("expire_stale_chats");
    const { data } = await admin
      .from("chat_sessions")
      .select("id, client_id, listener_id, agent_user_id, status, started_at, ended_at")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(100);
    return describeSessions(admin, data ?? []);
  });

/** Past conversations for one agent. */
export const listAgentArchive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { agentUserId: string }) =>
    z.object({ agentUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context);
    const { data: rows } = await admin
      .from("chat_sessions")
      .select("id, client_id, listener_id, agent_user_id, status, started_at, ended_at")
      .eq("agent_user_id", data.agentUserId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(100);
    return describeSessions(admin, rows ?? []);
  });

/** Full transcript plus the logged customer notes, for admins. */
export const getTranscriptAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await adminClient(context);
    const { data: session } = await admin
      .from("chat_sessions")
      .select("client_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    const [{ data: messages }, { data: notes }] = await Promise.all([
      admin
        .from("chat_messages")
        .select("id, sender_role, body, created_at")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true })
        .limit(1000),
      session
        ? admin
            .from("call_notes")
            .select("id, category, body, created_at")
            .eq("client_id", session.client_id)
            .order("created_at", { ascending: false })
            .limit(100)
        : { data: [] },
    ]);
    return { messages: messages ?? [], notes: notes ?? [] };
  });
