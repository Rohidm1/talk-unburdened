import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Ear, EarOff, MessageCircle, Phone, UserPlus } from "lucide-react";
import type { Call } from "@twilio/voice-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminStats } from "@/lib/staff.functions";
import {
  listAgentsLive,
  listClientStats,
  listLiveConversations,
  startMonitor,
  stopMonitor,
} from "@/lib/admin.functions";
import { createAgentAccount, setAgentListener } from "@/lib/crm.functions";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — Anontalk platform analytics" },
      {
        name: "description",
        content:
          "Anontalk admin overview: agent availability, live conversations, customer talk time and revenue.",
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

function elapsedSince(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchStats = useServerFn(getAdminStats);
  const fetchAgents = useServerFn(listAgentsLive);
  const fetchLive = useServerFn(listLiveConversations);
  const fetchClients = useServerFn(listClientStats);
  const beginMonitor = useServerFn(startMonitor);
  const endMonitor = useServerFn(stopMonitor);
  const addAgent = useServerFn(createAgentAccount);
  const linkAgentProfile = useServerFn(setAgentListener);

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

  const voice = useTwilioDevice(true);
  const [monitor, setMonitor] = useState<{ id: string; callId: string; call: Call | null } | null>(
    null,
  );

  const listen = async (callId: string) => {
    if (monitor) await leave();
    const res = await beginMonitor({ data: { callId } });
    if (!res.ok || !res.conferenceAuth || !res.monitorId) {
      toast.error("Dit gesprek loopt niet meer.");
      return;
    }
    try {
      const call = await voice.connect({
        Mode: "monitor",
        Identity: voice.identity ?? "",
        CallRecordId: callId,
        ConferenceAuth: res.conferenceAuth,
      });
      call?.mute(true);
      setMonitor({ id: res.monitorId, callId, call: call ?? null });
      toast.success("Je luistert stil mee. Je microfoon staat uit.");
    } catch {
      await endMonitor({ data: { monitorId: res.monitorId } });
      toast.error("Kon niet meeluisteren. Controleer je audio-instellingen.");
    }
    void live.refetch();
  };

  const leave = async () => {
    if (!monitor) return;
    monitor.call?.disconnect();
    try {
      await endMonitor({ data: { monitorId: monitor.id } });
    } catch {
      /* the log entry closes on the next scan */
    }
    setMonitor(null);
    void live.refetch();
  };

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
              {
                label: "Live gesprekken",
                value: (live.data?.calls.length ?? 0) + (live.data?.chats.length ?? 0),
              },
              { label: "Gespreksminuten", value: stats.data?.totalMinutes ?? 0 },
              {
                label: "Omzet",
                value: `€ ${((stats.data?.revenueCents ?? 0) / 100).toFixed(2)}`,
              },
            ].map((k) => (
              <div key={k.label} className="rounded-3xl border border-border bg-card p-6">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">{k.label}</p>
                <p className="mt-2 font-display text-3xl tabular-nums">{k.value}</p>
              </div>
            ))}
          </section>

          {monitor ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-primary/40 bg-primary/10 p-5">
              <Ear className="size-5 text-primary" />
              <span className="flex-1 text-sm">
                Je luistert stil mee. De klant en de agent merken hier niets van.
              </span>
              <Button variant="outline" onClick={() => void leave()}>
                <EarOff className="size-4" /> Stoppen
              </Button>
            </div>
          ) : null}

          <Tabs defaultValue="live" className="mt-8">
            <TabsList>
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="clients">Klanten</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-6 grid gap-6">
              <section className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-2">
                  <Phone className="size-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Lopende gesprekken</h2>
                </div>
                {live.data && live.data.calls.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border">
                    {live.data.calls.map((c) => (
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
                            {c.clientAlias} · {c.status === "active" ? "in gesprek" : "gaat over"} ·{" "}
                            {c.mode === "free" ? "gratis minuten" : "betaald"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums">
                            {clock(elapsedSince(c.answeredAt ?? c.startedAt))}
                          </span>
                          {c.status === "active" ? (
                            monitor?.callId === c.id ? (
                              <Button size="sm" variant="outline" onClick={() => void leave()}>
                                <EarOff className="size-4" /> Stoppen
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => void listen(c.id)}>
                                <Ear className="size-4" /> Meeluisteren
                              </Button>
                            )
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Geen lopende gesprekken.</p>
                )}
              </section>

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
                            className={`size-2.5 rounded-full ${a.status === "online" ? "bg-success" : a.status === "busy" ? "bg-primary" : "bg-muted-foreground"}`}
                          />
                          <span className="font-semibold">{a.username}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {a.status}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {a.activeChats} chat(s) actief · {a.chatSlotsLeft} plek(ken) vrij
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.profiles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Nog geen profielen gekoppeld
                          </span>
                        ) : (
                          a.profiles.map((p) => (
                            <span
                              key={p.id}
                              className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                            >
                              {p.name}
                            </span>
                          ))
                        )}
                      </div>
                    </li>
                  ))}
                  {(agents.data?.agents ?? []).length === 0 ? (
                    <li className="py-4 text-sm text-muted-foreground">Nog geen agents.</li>
                  ) : null}
                </ul>
              </section>

              <NewAgentForm
                listeners={agents.data?.listeners ?? []}
                onCreate={async (values) => {
                  await addAgent({ data: values });
                  void queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
                }}
              />
            </TabsContent>

            <TabsContent value="clients" className="mt-6">
              <section className="rounded-3xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-semibold">Klanten</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2">Klant</th>
                        <th className="py-2">Gesprekken</th>
                        <th className="py-2">Beltijd</th>
                        <th className="py-2">Chats</th>
                        <th className="py-2">Chattijd</th>
                        <th className="py-2">Totaal</th>
                        <th className="py-2">Besteed</th>
                        <th className="py-2">Saldo</th>
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
                          <td className="py-2 tabular-nums">{c.calls}</td>
                          <td className="py-2 tabular-nums">{clock(c.callSeconds)}</td>
                          <td className="py-2 tabular-nums">{c.chats}</td>
                          <td className="py-2 tabular-nums">{clock(c.chatSeconds)}</td>
                          <td className="py-2 font-semibold tabular-nums">
                            {clock(c.totalSeconds)}
                          </td>
                          <td className="py-2 tabular-nums">
                            € {(c.purchasedCents / 100).toFixed(2)}
                          </td>
                          <td className="py-2 tabular-nums">
                            {clock(c.creditSeconds + c.freeSeconds)}
                          </td>
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
  avatarKey: string;
  bioEn: string;
  bioNl: string;
  languages: string[];
  topicsEn: string[];
  topicsNl: string[];
  years: number;
  existingListenerId: string | null;
};

function NewAgentForm({
  listeners,
  onCreate,
}: {
  listeners: { id: string; display_name: string }[];
  onCreate: (values: NewAgentValues, profileIds: string[]) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      onCreate(
        {
          username: username.trim(),
          password,
          displayName: displayName.trim(),
          // The agent works behind existing fictional profiles, so no new card
          // is created — these are only defaults if none is linked.
          avatarKey: "amara",
          bioEn: "A warm listener.",
          bioNl: "Een warme luisteraar.",
          languages: ["NL"],
          topicsEn: [],
          topicsNl: [],
          years: 1,
          existingListenerId: picked[0] ?? null,
        },
        picked,
      ),
    onSuccess: () => {
      toast.success("Agent aangemaakt.");
      setUsername("");
      setPassword("");
      setDisplayName("");
      setPicked([]);
    },
    onError: (e: Error) => toast.error(e.message || "Kon de agent niet aanmaken."),
  });

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

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

        <div className="flex flex-col gap-2">
          <Label>Koppel aan profielen</Label>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-secondary/30 p-3">
            {listeners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen profielen.</p>
            ) : (
              listeners.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={picked.includes(l.id)} onCheckedChange={() => toggle(l.id)} />
                  {l.display_name}
                </label>
              ))
            )}
          </div>
        </div>

        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Bezig…" : "Agent aanmaken"}
        </Button>
      </form>
    </section>
  );
}
