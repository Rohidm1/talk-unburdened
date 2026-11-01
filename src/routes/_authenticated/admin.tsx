import { SupportInbox } from "@/components/site/SupportInbox";
import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, CalendarClock, Globe, MessageCircle, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminStats } from "@/lib/staff.functions";
import {
  getTrafficStats,
  listAgentsLive,
  listClientStats,
  listLiveConversations,
} from "@/lib/admin.functions";
import { createAgentAccount, deleteAgentAccount, getAgentMonthlyStats } from "@/lib/crm.functions";
import {
  getAiTranscript,
  getEngagementAnalytics,
  listAiConversations,
} from "@/lib/insights.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/staff" });
  },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Admin panel — Anontalk platform analytics" },
      {
        name: "description",
        content:
          "Anontalk admin overview: agent availability, live chats, customer messages and revenue.",
      },
      { property: "og:title", content: "Admin panel — Anontalk" },
      { property: "og:description", content: "Platform analytics for Anontalk operators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(seconds % 60, 0);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function hours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function timeOf(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function elapsedSince(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function statusLabel(a: { availability: string; inChat: boolean }) {
  if (a.availability === "offline") return "Offline";
  if (a.inChat) return "In chat";
  if (a.availability === "break") return "On break";
  return "Available";
}

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchStats = useServerFn(getAdminStats);
  const fetchAgents = useServerFn(listAgentsLive);
  const fetchLive = useServerFn(listLiveConversations);
  const fetchClients = useServerFn(listClientStats);
  const addAgent = useServerFn(createAgentAccount);
  const removeAgent = useServerFn(deleteAgentAccount);

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats(), retry: false });
  const agents = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => fetchAgents(),
    refetchInterval: 5000,
    retry: false,
  });
  const live = useQuery({
    queryKey: ["admin-live"],
    queryFn: () => fetchLive(),
    refetchInterval: 4000,
    retry: false,
  });
  const clients = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => fetchClients(),
    refetchInterval: 30000,
    retry: false,
  });

  const denied = agents.isError;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin panel</h1>
        <Button variant="outline" asChild>
          <Link to="/account">Back to account</Link>
        </Button>
      </div>

      {denied ? (
        <p className="mt-8 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          You need admin rights for this page.
        </p>
      ) : (
        <>
          <p className="mt-6 text-xs text-muted-foreground">
            Statistics count from 4 September 2026 (analytics reset).
          </p>
          <section className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Agents online", value: agents.data?.onlineCount ?? 0 },
              { label: "Live chats", value: live.data?.chats.length ?? 0 },
              { label: "Messages sent", value: stats.data?.messagesSent ?? 0 },
              { label: "Revenue", value: `$${((stats.data?.revenueCents ?? 0) / 100).toFixed(2)}` },
            ].map((k) => (
              <div key={k.label} className="rounded-3xl border border-border bg-card p-6">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">{k.label}</p>
                <p className="mt-2 font-display text-3xl tabular-nums">{k.value}</p>
              </div>
            ))}
          </section>

          <Tabs defaultValue="live" className="mt-8">
            <TabsList>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="hours">Work hours</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="traffic">Visitors</TabsTrigger>
              <TabsTrigger value="ai">AI monitor</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-6">
              <section className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Ongoing chats</h2>
                </div>
                {live.data && live.data.chats.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border">
                    {live.data.chats.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold">
                            {c.profileName}
                            <span className="ml-2 font-normal text-muted-foreground">
                              agent {c.agent ?? "—"}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.clientAlias} · {c.status === "active" ? "active" : "waiting"}
                          </p>
                        </div>
                        <span className="tabular-nums">
                          {clock(elapsedSince(c.answeredAt ?? c.startedAt))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">No ongoing chats.</p>
                )}
              </section>
            </TabsContent>

            <TabsContent value="agents" className="mt-6 grid gap-6 lg:grid-cols-5">
              <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-3">
                <h2 className="font-display text-lg font-semibold">Agents</h2>
                <ul className="mt-4 divide-y divide-border">
                  {(agents.data?.agents ?? []).map((a) => (
                    <li key={a.userId} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2.5 rounded-full ${a.availability === "available" ? "bg-success" : a.availability === "break" ? "bg-primary" : "bg-muted-foreground"}`}
                          />
                          <span className="font-semibold">{a.username}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {statusLabel(a)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {a.activeChats} chat(s) active
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${a.username}`}
                          onClick={async () => {
                            if (!window.confirm(`Delete account "${a.username}" permanently?`))
                              return;
                            try {
                              await removeAgent({ data: { userId: a.userId } });
                              toast.success("Agent deleted.");
                              void queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
                              void queryClient.invalidateQueries({ queryKey: ["admin-hours"] });
                            } catch (e) {
                              toast.error((e as Error).message || "Delete failed.");
                            }
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                      {a.handling.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {a.handling.map((h) => (
                            <li key={h.sessionId}>
                              {h.profileName} — {h.clientAlias}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {a.lastSeenAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last seen {new Date(a.lastSeenAt).toLocaleString()}
                        </p>
                      ) : null}
                    </li>
                  ))}
                  {(agents.data?.agents ?? []).length === 0 ? (
                    <li className="py-4 text-sm text-muted-foreground">No agents yet.</li>
                  ) : null}
                </ul>
              </section>

              <NewAgentForm
                onCreate={async (values) => {
                  await addAgent({ data: values });
                  void queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
                }}
              />
            </TabsContent>

            <TabsContent value="hours" className="mt-6">
              <MonthlyHours />
            </TabsContent>

            <TabsContent value="clients" className="mt-6">
              <section className="rounded-3xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-semibold">Clients</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2">Client</th>
                        <th className="py-2">Chats</th>
                        <th className="py-2">Chat time</th>
                        <th className="py-2">Messages</th>
                        <th className="py-2">Spent</th>
                        <th className="py-2">Credits</th>
                        <th className="py-2">Free</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(clients.data ?? []).map((c) => (
                        <tr key={c.id}>
                          <td className="py-2 font-medium">
                            {c.alias}
                            {c.isBlocked ? (
                              <span className="ml-2 rounded bg-destructive/15 px-1.5 py-0.5 text-[11px] text-destructive">
                                blocked
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 tabular-nums">{c.chats}</td>
                          <td className="py-2 tabular-nums">{clock(c.chatSeconds)}</td>
                          <td className="py-2 tabular-nums">{c.messages}</td>
                          <td className="py-2 tabular-nums">
                            ${(c.purchasedCents / 100).toFixed(2)}
                          </td>
                          <td className="py-2 tabular-nums">{c.credits}</td>
                          <td className="py-2 tabular-nums">{c.freeCredits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(clients.data ?? []).length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">No clients yet.</p>
                  ) : null}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="traffic" className="mt-6">
              <TrafficPanel />
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <AiMonitorPanel />
            </TabsContent>

            <TabsContent value="engagement" className="mt-6">
              <EngagementPanel />
            </TabsContent>
            <TabsContent value="inbox" className="mt-6">
              <SupportInbox />
            </TabsContent>
          </Tabs>
        </>
      )}
    </main>
  );
}

type NewAgentValues = {
  username: string;
  password: string;
  displayName: string;
};

const countryNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function countryLabel(code: string) {
  if (code === "Unknown") return "Unknown";
  try {
    return countryNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function TrafficPanel() {
  const fetchTraffic = useServerFn(getTrafficStats);
  const [days, setDays] = useState(30);
  const traffic = useQuery({
    queryKey: ["admin-traffic", days],
    queryFn: () => fetchTraffic({ data: { days } }),
    refetchInterval: 60000,
    retry: false,
  });
  const d = traffic.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={days === n ? "default" : "outline"}
            onClick={() => setDays(n)}
          >
            Last {n} days
          </Button>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Unique visitors", value: d?.uniqueVisitors ?? 0 },
          { label: "Page views", value: d?.pageViews ?? 0 },
          { label: "New accounts", value: d?.signups ?? 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">{k.label}</p>
            <p className="mt-2 font-display text-3xl tabular-nums">{k.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Countries</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2">Country</th>
                <th className="py-2">Visitors</th>
                <th className="py-2">Views</th>
                <th className="py-2">Signups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(d?.countries ?? []).map((c) => (
                <tr key={c.country}>
                  <td className="py-2 font-medium">{countryLabel(c.country)}</td>
                  <td className="py-2 tabular-nums">{c.visitors}</td>
                  <td className="py-2 tabular-nums">{c.visits}</td>
                  <td className="py-2 tabular-nums">{c.signups}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(d?.countries ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No visitor data in this period yet.
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Per day</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Visitors</th>
                  <th className="py-2">Signups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(d?.daily ?? []).map((row) => (
                  <tr key={row.date}>
                    <td className="py-2">{row.date}</td>
                    <td className="py-2 tabular-nums">{row.visitors}</td>
                    <td className="py-2 tabular-nums">{row.signups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(d?.daily ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Most popular pages</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="py-2">Page</th>
                  <th className="py-2">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(d?.topPages ?? []).map((row) => (
                  <tr key={row.path}>
                    <td className="py-2">{row.path}</td>
                    <td className="py-2 tabular-nums">{row.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(d?.topPages ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
            ) : null}
          </div>
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        Countries are determined from the visitor's network. Signups get the country of their
        first visit after registering.
      </p>
    </div>
  );
}

function NewAgentForm({ onCreate }: { onCreate: (values: NewAgentValues) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      onCreate({
        username: username.trim(),
        password,
        displayName: displayName.trim(),
      }),
    onSuccess: () => {
      toast.success("Agent created.");
      setUsername("");
      setPassword("");
      setDisplayName("");
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the agent."),
  });

  const valid =
    username.trim().length >= 3 && password.length >= 8 && displayName.trim().length > 1;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
      <div className="flex items-center gap-2">
        <UserPlus className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">New agent account</h2>
      </div>

      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) mutation.mutate();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-username">Username</Label>
          <Input
            id="agent-username"
            value={username}
            maxLength={32}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="sanne01"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-password">Password</Label>
          <Input
            id="agent-password"
            type="password"
            value={password}
            maxLength={72}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-name">Display name</Label>
          <Input
            id="agent-name"
            value={displayName}
            maxLength={40}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Sanne"
          />
        </div>

        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Working…" : "Create agent"}
        </Button>
      </form>
    </section>
  );
}

function MonthlyHours() {
  const [month, setMonth] = useState(currentMonth());
  const fetchHours = useServerFn(getAgentMonthlyStats);
  const stats = useQuery({
    queryKey: ["admin-hours", month],
    queryFn: () => fetchHours({ data: { month } }),
    retry: false,
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarClock className="size-5 shrink-0 text-primary" />
          <h2 className="truncate font-display text-lg font-semibold">Monthly statistics</h2>
        </div>
        <Input
          type="month"
          value={month}
          className="w-44 shrink-0"
          onChange={(e) => setMonth(e.target.value || currentMonth())}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Per agent: first login, last activity, break time and hours worked per day.
      </p>

      {stats.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : (stats.data?.agents ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No agents found.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {(stats.data?.agents ?? []).map((a) => (
            <div key={a.userId} className="rounded-2xl border border-border p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="truncate font-semibold">{a.username}</p>
                <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {hours(a.totalOnlineSeconds)} worked · {hours(a.totalBreakSeconds)} break
                </p>
              </div>
              {a.days.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Not logged in this month yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2">Day</th>
                        <th className="py-2">First login</th>
                        <th className="py-2">Last active</th>
                        <th className="py-2">Break</th>
                        <th className="py-2">Worked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {a.days.map((d) => (
                        <tr key={d.date}>
                          <td className="py-2">
                            {new Date(`${d.date}T00:00:00Z`).toLocaleDateString([], {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td className="py-2 tabular-nums">{timeOf(d.firstOnline)}</td>
                          <td className="py-2 tabular-nums">{timeOf(d.lastSeen)}</td>
                          <td className="py-2 tabular-nums">{hours(d.breakSeconds)}</td>
                          <td className="py-2 font-medium tabular-nums">
                            {hours(d.onlineSeconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AiMonitorPanel() {
  const fetchConversations = useServerFn(listAiConversations);
  const fetchTranscript = useServerFn(getAiTranscript);
  const [selected, setSelected] = useState<string | null>(null);

  const conversations = useQuery({
    queryKey: ["admin-ai-conversations"],
    queryFn: () => fetchConversations(),
    refetchInterval: 5000,
    retry: false,
  });
  const transcript = useQuery({
    queryKey: ["admin-ai-transcript", selected],
    queryFn: () => fetchTranscript({ data: { sessionId: selected! } }),
    enabled: !!selected,
    refetchInterval: 4000,
    retry: false,
  });

  const rows = conversations.data?.conversations ?? [];

  return (
    <section className="grid gap-6 lg:grid-cols-5">
      <div className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Stand-in conversations</h2>
        </div>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No active stand-in conversations.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c.id)}
                  className={`w-full py-3 text-left text-sm ${
                    selected === c.id ? "text-primary" : ""
                  }`}
                >
                  <span className="font-medium">{c.profileName}</span>{" "}
                  <span className="text-muted-foreground">· {c.clientAlias}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.status}
                    {c.endedAt ? " · ended" : " · live"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 lg:col-span-3">
        <h2 className="font-display text-lg font-semibold">Transcript</h2>
        {!selected ? (
          <p className="mt-4 text-sm text-muted-foreground">Pick a conversation to read along.</p>
        ) : (
          <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
            {(transcript.data?.messages ?? []).map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.sender_role === "client"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.body}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EngagementPanel() {
  const fetchAnalytics = useServerFn(getEngagementAnalytics);
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ["admin-engagement", days],
    queryFn: () => fetchAnalytics({ data: { days } }),
    refetchInterval: 60000,
    retry: false,
  });
  const d = query.data;
  const maxFeature = Math.max(1, ...(d?.features ?? []).map((f) => f.value));
  const maxMood = Math.max(1, ...(d?.moods ?? []).map((m) => m.value));

  return (
    <section className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={days === n ? "default" : "outline"}
            onClick={() => setDays(n)}
          >
            {n} days
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Match success", value: `${d?.match.successRate ?? 0}%` },
          { label: "Chats started", value: d?.match.started ?? 0 },
          { label: "Avg. DAU", value: d?.stickiness.avgDau ?? 0 },
          {
            label: "Avg. chat length",
            value: `${Math.round((d?.stickiness.avgSessionSeconds ?? 0) / 60)} min`,
          },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl border border-border bg-card p-6">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">{k.label}</p>
            <p className="mt-2 font-display text-3xl tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Feature heatmap</h2>
          <ul className="mt-4 space-y-3">
            {(d?.features ?? []).map((f) => (
              <li key={f.key} className="text-sm">
                <div className="flex justify-between">
                  <span>{f.key}</span>
                  <span className="tabular-nums text-muted-foreground">{f.value}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(f.value / maxFeature) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Moods & depth</h2>
          {(d?.moods ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(d?.moods ?? []).map((m) => (
                <li key={m.mood} className="text-sm">
                  <div className="flex justify-between">
                    <span className="capitalize">{m.mood}</span>
                    <span className="tabular-nums text-muted-foreground">{m.value}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-2"
                      style={{ width: `${(m.value / maxMood) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {(d?.depths ?? []).map((x) => (
              <span
                key={x.depth}
                className="rounded-full border border-border px-3 py-1 text-xs capitalize"
              >
                {x.depth}: {x.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Daily activity</h2>
        <ul className="mt-4 space-y-1 text-sm">
          {(d?.daily ?? []).map((row) => (
            <li key={row.date} className="flex justify-between tabular-nums">
              <span className="text-muted-foreground">{row.date}</span>
              <span>
                {row.dau} visitors · {row.chats} chats
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
