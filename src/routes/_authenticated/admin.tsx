import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, MessageCircle, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminStats } from "@/lib/staff.functions";
import { listAgentsLive, listClientStats, listLiveConversations } from "@/lib/admin.functions";
import {
  createAgentAccount,
  deleteAgentAccount,
  getAgentMonthlyStats,
} from "@/lib/crm.functions";

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
      { title: "Admin panel — Anontalk platform analytics" },
      {
        name: "description",
        content: "Anontalk admin overview: agent availability, live chats, customer messages and revenue.",
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
          <Link to="/account">Terug naar account</Link>
        </Button>
      </div>

      {denied ? (
        <p className="mt-8 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Je hebt beheerdersrechten nodig voor deze pagina.
        </p>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Agents online", value: agents.data?.onlineCount ?? 0 },
              { label: "Live chats", value: live.data?.chats.length ?? 0 },
              { label: "Messages sent", value: stats.data?.messagesSent ?? 0 },
              { label: "Omzet", value: `$${((stats.data?.revenueCents ?? 0) / 100).toFixed(2)}` },
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
              <TabsTrigger value="hours">Werkuren</TabsTrigger>
              <TabsTrigger value="clients">Klanten</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-6">
              <section className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Lopende chats</h2>
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
                            {c.clientAlias} · {c.status === "active" ? "actief" : "wacht"}
                          </p>
                        </div>
                        <span className="tabular-nums">
                          {clock(elapsedSince(c.answeredAt ?? c.startedAt))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Geen lopende chats.</p>
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
                          {a.activeChats} chat(s) actief
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Verwijder ${a.username}`}
                          onClick={async () => {
                            if (!window.confirm(`Account "${a.username}" definitief verwijderen?`))
                              return;
                            try {
                              await removeAgent({ data: { userId: a.userId } });
                              toast.success("Agent verwijderd.");
                              void queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
                              void queryClient.invalidateQueries({ queryKey: ["admin-hours"] });
                            } catch (e) {
                              toast.error((e as Error).message || "Verwijderen mislukt.");
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
                    <li className="py-4 text-sm text-muted-foreground">Nog geen agents.</li>
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
                <h2 className="font-display text-lg font-semibold">Klanten</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2">Klant</th>
                        <th className="py-2">Chats</th>
                        <th className="py-2">Chattijd</th>
                        <th className="py-2">Berichten</th>
                        <th className="py-2">Besteed</th>
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
                                geblokkeerd
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
                    <p className="mt-4 text-sm text-muted-foreground">Nog geen klanten.</p>
                  ) : null}
                </div>
              </section>
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
      toast.success("Agent aangemaakt.");
      setUsername("");
      setPassword("");
      setDisplayName("");
    },
    onError: (e: Error) => toast.error(e.message || "Kon de agent niet aanmaken."),
  });

  const valid =
    username.trim().length >= 3 && password.length >= 8 && displayName.trim().length > 1;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
      <div className="flex items-center gap-2">
        <UserPlus className="size-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Nieuw agent-account</h2>
      </div>

      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) mutation.mutate();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-username">Gebruikersnaam</Label>
          <Input
            id="agent-username"
            value={username}
            maxLength={32}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="sanne01"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-password">Wachtwoord</Label>
          <Input
            id="agent-password"
            type="password"
            value={password}
            maxLength={72}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimaal 8 tekens"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-name">Schermnaam</Label>
          <Input
            id="agent-name"
            value={displayName}
            maxLength={40}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Sanne"
          />
        </div>

        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Bezig…" : "Agent aanmaken"}
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
          <h2 className="truncate font-display text-lg font-semibold">Maandstatistieken</h2>
        </div>
        <Input
          type="month"
          value={month}
          className="w-44 shrink-0"
          onChange={(e) => setMonth(e.target.value || currentMonth())}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Per agent: eerste login, laatste activiteit, pauzeduur en gewerkte uren per dag.
      </p>

      {stats.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Laden…</p>
      ) : (stats.data?.agents ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Geen agents gevonden.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {(stats.data?.agents ?? []).map((a) => (
            <div key={a.userId} className="rounded-2xl border border-border p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <p className="truncate font-semibold">{a.username}</p>
                <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {hours(a.totalOnlineSeconds)} gewerkt · {hours(a.totalBreakSeconds)} pauze
                </p>
              </div>
              {a.days.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Deze maand nog niet ingelogd.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2">Dag</th>
                        <th className="py-2">Eerste login</th>
                        <th className="py-2">Laatst actief</th>
                        <th className="py-2">Pauze</th>
                        <th className="py-2">Gewerkt</th>
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
