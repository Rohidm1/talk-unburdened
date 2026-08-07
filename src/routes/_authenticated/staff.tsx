import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BellRing,
  Headphones,
  History,
  Mic,
  MicOff,
  NotebookPen,
  Phone,
  PhoneOff,
  UserRound,
} from "lucide-react";
import type { Call } from "@twilio/voice-sdk";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMyAccount } from "@/lib/account.functions";
import { listMyNotes, setMyStatus } from "@/lib/staff.functions";
import {
  answerCall,
  declineCall,
  getCallContext,
  pollIncomingCall,
  releaseAgent,
  saveCallNote,
} from "@/lib/agent.functions";
import { AgentChatPanel } from "@/components/site/AgentChatPanel";
import { AudioDiagnostics } from "@/components/site/AudioDiagnostics";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { useIncomingCallAlert } from "@/hooks/useIncomingCallAlert";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Listener desk — Anontalk staff dashboard" },
      {
        name: "description",
        content:
          "Set your availability and keep private conversation notes as an Anontalk listener.",
      },
      { property: "og:title", content: "Listener desk — Anontalk" },
      { property: "og:description", content: "Availability and private notes for listeners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type CallContext = Awaited<ReturnType<typeof getCallContext>>;

function StaffPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchNotes = useServerFn(listMyNotes);
  const saveStatus = useServerFn(setMyStatus);
  const fetchContext = useServerFn(getCallContext);
  const accept = useServerFn(answerCall);
  const decline = useServerFn(declineCall);
  const release = useServerFn(releaseAgent);
  const storeNote = useServerFn(saveCallNote);
  const pollCall = useServerFn(pollIncomingCall);

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => fetchNotes() });

  const statusMutation = useMutation({
    mutationFn: (status: "online" | "offline") => saveStatus({ data: { status } }),
    onSuccess: () => {
      toast.success("Status bijgewerkt.");
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["listeners"] });
    },
    onError: () => toast.error("Kon je status niet bijwerken."),
  });

  const isStaff = account.data?.roles.includes("staff");
  const myProfiles = account.data?.myProfiles ?? [];
  const username = user?.email?.split("@")[0] ?? "Agent";
  const voice = useTwilioDevice(!!isStaff);
  const [active, setActive] = useState<Call | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<"idle" | "connecting" | "live" | "failed">("idle");
  const [audioMessage, setAudioMessage] = useState("");
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [activeContext, setActiveContext] = useState<CallContext | null>(null);
  const [incomingContext, setIncomingContext] = useState<CallContext | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const noteRef = useRef("");
  const alerts = useIncomingCallAlert(!!incomingCallId);
  const online = account.data?.agentStatus === "online";

  useEffect(() => {
    noteRef.current = noteDraft;
  }, [noteDraft]);

  // Keeps presence fresh while the desk is open, so profiles stay reachable.
  useEffect(() => {
    if (!isStaff || !online) return;
    const id = setInterval(() => {
      void saveStatus({ data: { status: "online" } });
    }, 30_000);
    return () => clearInterval(id);
  }, [isStaff, online, saveStatus]);

  // Calls are bridged through a conference, so the database — not a Twilio
  // "incoming" event — tells the agent that a caller is waiting.
  const ringing = useQuery({
    queryKey: ["incoming-call"],
    queryFn: () => pollCall(),
    enabled: !!isStaff && online && !activeCallId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (activeCallId) return;
    setIncomingCallId(ringing.data?.callId ?? null);
  }, [ringing.data?.callId, activeCallId]);

  // Pull the caller dossier as soon as the line rings.
  useEffect(() => {
    if (!incomingCallId) {
      setIncomingContext(null);
      return;
    }
    let cancelled = false;
    void fetchContext({ data: { callId: incomingCallId } })
      .then((ctx) => {
        if (!cancelled) setIncomingContext(ctx);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [incomingCallId, fetchContext]);

  // Live stopwatch for the active conversation.
  useEffect(() => {
    if (!activeCallId) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [activeCallId]);

  const finishCall = async (call: Call | null, ctx: CallContext | null) => {
    call?.disconnect();
    setActive(null);
    setActiveCallId(null);
    setAudioState("idle");
    setMuted(false);
    const body = noteRef.current.trim();
    const callId = ctx?.callId ?? null;
    if (callId && body) {
      try {
        await storeNote({ data: { callId, body } });
        toast.success("Gespreksnotitie opgeslagen.");
      } catch {
        toast.error("Notitie kon niet worden opgeslagen.");
      }
    }
    setNoteDraft("");
    noteRef.current = "";
    setActiveContext(null);
    try {
      await release({});
    } catch {
      /* status stays as-is */
    }
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: ["account"] });
  };

  const acceptCall = async () => {
    const callId = incomingCallId;
    if (!callId) return;
    // The dossier may still be loading — never let that block the workspace.
    let ctx = incomingContext;
    let conferenceAuth: string | null = null;
    try {
      const res = await accept({ data: { callId } });
      if (!res.ok || !res.conferenceAuth) {
        toast.error("Dit gesprek is niet meer beschikbaar.");
        setIncomingCallId(null);
        return;
      }
      conferenceAuth = res.conferenceAuth;
    } catch {
      toast.error("Kon het gesprek niet aannemen.");
      return;
    }

    if (!ctx) {
      try {
        ctx = await fetchContext({ data: { callId } });
      } catch {
        ctx = null;
      }
    }

    // Open the workspace first: the agent must always see the client details,
    // notes and hang-up controls, even if the audio leg needs a retry.
    setActiveContext(ctx);
    setActiveCallId(callId);
    setIncomingCallId(null);
    setIncomingContext(null);
    await connectAudio(callId, conferenceAuth, ctx);
  };

  const MAX_AUDIO_ATTEMPTS = 3;

  const connectAudio = async (
    callId: string,
    conferenceAuth: string,
    ctx: CallContext | null,
    attempt = 1,
  ) => {
    setAudioState("connecting");
    setAudioMessage(
      attempt === 1 ? "Audio wordt verbonden…" : `Opnieuw verbinden… poging ${attempt}/${MAX_AUDIO_ATTEMPTS}`,
    );
    try {
      const call = await voice.connect({
        Mode: "agent",
        Identity: voice.identity ?? "",
        CallRecordId: callId,
        ConferenceAuth: conferenceAuth,
      });
      if (!call) throw new Error("no-call");
      call.on("disconnect", () => void finishCall(null, ctx));
      call.on("error", (err: unknown) => {
        console.error("[voice] agent call error", err);
        setAudioState("failed");
        setAudioMessage("Verbinding verbroken. Probeer opnieuw te verbinden.");
      });
      call.on("accept", () => setAudioState("live"));
      setActive(call);
      setAudioState("live");
      setAudioMessage("Audio-input gecontroleerd — je bent verbonden.");
    } catch (err) {
      console.error("[voice] agent audio failed", err);
      const denied = (err as Error)?.message === "microphone-denied";

      // A dropped media leg is usually transient: retry a few times with
      // exponential backoff before handing it back to the agent.
      if (!denied && attempt < MAX_AUDIO_ATTEMPTS) {
        setAudioMessage(
          `Verbinding verbroken… poging ${attempt + 1}/${MAX_AUDIO_ATTEMPTS} over ${2 ** (attempt - 1)}s`,
        );
        await new Promise((r) => setTimeout(r, 2 ** (attempt - 1) * 1000));
        try {
          const res = await accept({ data: { callId } });
          if (res.ok && res.conferenceAuth) {
            await connectAudio(callId, res.conferenceAuth, ctx, attempt + 1);
            return;
          }
        } catch {
          /* fall through to the manual retry state */
        }
      }

      setAudioState("failed");
      setAudioMessage(
        denied
          ? "Geen toegang tot je microfoon. Sta toegang toe en verbind opnieuw."
          : `Audio kon niet starten na ${attempt} poging(en). Draai de audio-diagnose.`,
      );
      setDiagnosticsOpen(true);
      toast.error(
        denied
          ? "Geef toegang tot je microfoon om te kunnen praten."
          : "De audio kon niet starten. Probeer opnieuw te verbinden.",
      );
    }
  };

  const retryAudio = async () => {
    if (!activeCallId) return;
    try {
      const res = await accept({ data: { callId: activeCallId } });
      if (!res.ok || !res.conferenceAuth) {
        toast.error("Dit gesprek is niet meer actief.");
        return;
      }
      await connectAudio(activeCallId, res.conferenceAuth, activeContext);
    } catch {
      toast.error("Opnieuw verbinden is niet gelukt.");
    }
  };

  const rejectCall = async () => {
    const callId = incomingCallId;
    if (callId) {
      try {
        await decline({ data: { callId } });
      } catch {
        /* the caller side times out anyway */
      }
    }
    setIncomingCallId(null);
    setIncomingContext(null);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Agent dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingelogd als <span className="font-semibold text-foreground">{username}</span>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/account">Terug naar account</Link>
        </Button>
      </div>

      {!isStaff ? (
        <p className="mt-8 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Deze pagina is voor medewerkers. Vraag een beheerder om je de medewerkersrol te geven.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Beschikbaarheid</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {voice.ready
                    ? "Je lijn staat open — houd deze pagina open."
                    : "Je lijn wordt verbonden…"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                    online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${online ? "bg-success" : "bg-destructive"}`}
                  />
                  {online ? "Online" : "Offline"}
                </span>
                <Switch
                  checked={online}
                  disabled={statusMutation.isPending}
                  onCheckedChange={(next) => statusMutation.mutate(next ? "online" : "offline")}
                  aria-label="Beschikbaarheid"
                />
              </div>
            </div>

            {alerts.permission !== "granted" ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-4">
                <span className="flex-1 text-sm text-muted-foreground">
                  Zet geluid en meldingen aan zodat je geen oproep mist als dit tabblad op de
                  achtergrond staat.
                </span>
                <Button variant="outline" onClick={() => void alerts.requestPermission()}>
                  <BellRing className="size-4" /> Meldingen aanzetten
                </Button>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <UserRound className="size-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Mijn Profielen</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Oproepen naar deze profielen komen bij jou binnen.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {myProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nog geen profielen gekoppeld. Vraag de beheerder.
                </p>
              ) : (
                myProfiles.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border border-primary/30 bg-secondary/40 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {p.display_name}
                  </span>
                ))
              )}
            </div>
          </section>

          {activeCallId ? (
            <section className="grid gap-6 lg:col-span-3 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-2">
                  <Phone className="size-5 text-success" />
                  <h2 className="font-display text-lg font-semibold">
                    Gesprek als {activeContext?.profileName ?? "profiel"}
                  </h2>
                </div>
                {audioState !== "live" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3 text-sm">
                    <span className="flex-1 text-muted-foreground">
                      {audioMessage ||
                        (audioState === "connecting"
                          ? "Audio wordt verbonden…"
                          : "Geen audioverbinding met de beller.")}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDiagnosticsOpen(true)}
                    >
                      <Headphones className="size-4" /> Audio-diagnose
                    </Button>
                    {audioState === "failed" ? (
                      <Button size="sm" variant="outline" onClick={() => void retryAudio()}>
                        Opnieuw verbinden
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border border-success/40 bg-success/10 p-3 text-sm text-success">
                    Audio-input gecontroleerd — verbinding actief.
                  </p>
                )}
                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground">Talk time used</p>
                  <p className="font-display text-5xl tabular-nums">{clock(elapsed)}</p>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={!active}
                    onClick={() =>
                      setMuted((m) => {
                        active?.mute(!m);
                        return !m;
                      })
                    }
                  >
                    {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                    {muted ? "Micro aan" : "Micro uit"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => void finishCall(active, activeContext)}
                  >
                    <PhoneOff className="size-4" /> Ophangen
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Klantgegevens</h2>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Gebruiker</dt>
                    <dd className="font-semibold">{activeContext?.callerAlias ?? "Anoniem"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Lid sinds</dt>
                    <dd className="font-semibold">
                      {activeContext?.callerSince
                        ? new Date(activeContext.callerSince).toLocaleDateString("nl-NL")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Eerdere gesprekken</dt>
                    <dd className="font-semibold">{activeContext?.previousCalls ?? 0}</dd>
                  </div>
                </dl>

                <p className="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Eerdere notities
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-border bg-secondary/30 p-3">
                  {activeContext && activeContext.notes.length > 0 ? (
                    <ul className="flex flex-col gap-3">
                      {activeContext.notes.map((n) => (
                        <li key={n.id} className="text-sm">
                          <span className="block text-xs text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("nl-NL")}
                          </span>
                          <span className="leading-relaxed">{n.body}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nog geen eerdere notities.</p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Label htmlFor="live-note">Gespreksnotities</Label>
                  <Textarea
                    id="live-note"
                    rows={4}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Belangrijke informatie voor een volgend gesprek…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wordt automatisch opgeslagen zodra je ophangt.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <div className="lg:col-span-3">
            <AgentChatPanel enabled={!!isStaff} />
          </div>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-3">
            <div className="flex items-center gap-2">
              <NotebookPen className="size-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Mijn notities</h2>
            </div>
            {notes.data && notes.data.length > 0 ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {notes.data.map((n) => (
                  <li key={n.id} className="rounded-2xl border border-border bg-secondary/30 p-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{n.client_alias ?? "Anoniem"}</span>
                      <span>{new Date(n.created_at).toLocaleDateString("nl-NL")}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{n.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nog geen notities.</p>
            )}
          </section>
        </div>
      )}

      <Dialog open={!!incomingCallId} onOpenChange={(o) => !o && void rejectCall()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <Phone className="size-10 animate-bounce text-success" />
            <DialogTitle className="mt-2 font-display text-xl">
              Inkomende oproep voor {incomingContext?.profileName ?? "…"}
            </DialogTitle>
            <DialogDescription>De lijn gaat over. Neem op om te starten.</DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-center">
            <p className="font-display text-lg">{incomingContext?.callerAlias ?? "Anoniem"}</p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                incomingContext?.returning
                  ? "bg-primary/15 text-primary"
                  : "bg-success/15 text-success"
              }`}
            >
              {incomingContext?.returning ? "Terugkerende beller" : "Nieuwe beller"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={() => void acceptCall()}>
              <Phone className="size-4" /> Opnemen
            </Button>
            <Button variant="destructive" size="lg" onClick={() => void rejectCall()}>
              <PhoneOff className="size-4" /> Weigeren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AudioDiagnostics
        open={diagnosticsOpen}
        onOpenChange={setDiagnosticsOpen}
        statusLine={audioMessage || "We controleren je microfoon, geluid en verbinding."}
        onRetry={
          activeCallId
            ? () => {
                setDiagnosticsOpen(false);
                void retryAudio();
              }
            : undefined
        }
      />
    </main>
  );
}
