import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { ListenerCard } from "@/components/site/ListenerCard";
import { ActiveCallDialog, UnavailableDialog } from "@/components/site/CallDialogs";
import { TopUpDialog } from "@/components/site/TopUpDialog";
import { ContactSection, Faq, Footer, HowItWorks, Pricing } from "@/components/site/Sections";
import { listeners as fallbackListeners, type Listener } from "@/data/listeners";
import { listPublicListeners } from "@/lib/listeners.functions";
import { endCall, getMyAccount, heartbeatCall, startCall } from "@/lib/account.functions";
import { prepareDial } from "@/lib/voice.functions";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import type { Call } from "@twilio/voice-sdk";
import { avatarFor } from "@/lib/avatars";
import { useAuth } from "@/hooks/useAuth";

const title = "Anontalk — Anonymous voice calls with a listening ear";
const description =
  "Talk it out anonymously. Anontalk connects men in Belgium, the Netherlands and the US with warm listeners over a safe browser call. First 3 minutes free.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "https://anontalk.online/" },
    ],
    links: [{ rel: "canonical", href: "https://anontalk.online/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            [
              "Is it really anonymous?",
              "Yes. You choose an alias, and that's the only thing your listener ever sees. We never ask for your real name, address or phone number.",
            ],
            [
              "Are your listeners professionals?",
              "No — and we're upfront about that. Our listeners are trained, warm people who give you their full attention. They offer a listening ear and everyday perspective, not professional advice.",
            ],
            [
              "How do the 3 free minutes work?",
              "Every new account gets 3 free minutes on the very first call. No credit card needed. When the timer runs out you can top up or simply hang up.",
            ],
            [
              "How am I billed?",
              "Calls cost EUR 1.30 per minute, billed per second from your credit balance. Bundles bring the price down.",
            ],
            [
              "Who can see that I called?",
              "Nobody. Your payment description is neutral, calls run in the browser, and we never share anything with third parties.",
            ],
            [
              "What can I talk about?",
              "Work pressure, your relationship, money worries, a rough week, or nothing in particular. There is no wrong subject here.",
            ],
          ].map(([q, a]) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const fetchListeners = useServerFn(listPublicListeners);
  const fetchAccount = useServerFn(getMyAccount);
  const begin = useServerFn(startCall);
  const finish = useServerFn(endCall);
  const beat = useServerFn(heartbeatCall);
  const prepare = useServerFn(prepareDial);
  const voice = useTwilioDevice(!!session);

  const [activeCall, setActiveCall] = useState<Listener | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<Listener | null>(null);
  const [allowance, setAllowance] = useState(0);
  const [callMode, setCallMode] = useState<"paid" | "free">("paid");
  const [voiceCall, setVoiceCall] = useState<Call | null>(null);
  const [waitingForListener, setWaitingForListener] = useState(false);
  const [topUp, setTopUp] = useState<"free_used" | "no_credit" | null>(null);
  const notifiedRef = useRef(false);

  const listenersQuery = useQuery({
    queryKey: ["listeners"],
    queryFn: () => fetchListeners(),
    refetchInterval: 30000,
  });

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount(),
    enabled: !!session,
  });

  const list: Listener[] = useMemo(() => {
    const rows = listenersQuery.data;
    if (!rows || rows.length === 0) return fallbackListeners;
    return rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      avatar: avatarFor(r.avatar_key),
      age: r.years,
      bio: { en: r.bio_en, nl: r.bio_nl },
      language: (r.languages?.[0] ?? "EN").toUpperCase().startsWith("N") ? "NL" : "EN",
      topics: r.topics_en.map((en, i) => ({ en, nl: r.topics_nl[i] ?? en })),
      status: r.status,
      years: r.years,
    }));
  }, [listenersQuery.data]);

  const onlineList = useMemo(() => list.filter((l) => l.status === "online"), [list]);

  // Waiting line: alert the caller as soon as a listener frees up.
  useEffect(() => {
    if (!waitingForListener) {
      notifiedRef.current = false;
      return;
    }
    const next = onlineList[0];
    if (!next || notifiedRef.current) return;
    notifiedRef.current = true;
    setWaitingForListener(false);
    setUnavailable(null);
    toast.success(`${next.displayName} is free now`, {
      duration: 15000,
      action: { label: "Call now", onClick: () => void handleCall(next) },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForListener, onlineList]);

  const handleCall = async (l: Listener) => {
    if (!session) {
      void navigate({ to: "/auth" });
      return;
    }

    // Find a live agent first — no call is created (or billed) without one.
    const dial = await prepare({ data: { listenerId: l.id } });
    if (!dial.ready || !dial.toIdentity || !dial.dialAuth) {
      if (dial.reason === "unconfigured") {
        toast.error("Calling is temporarily unavailable. Please try again shortly.");
        return;
      }
      toast.error(`${l.displayName} is momenteel in gesprek`);
      setUnavailable(l);
      return;
    }

    const result = await begin({ data: { listenerId: l.id, agentUserId: dial.toIdentity } });
    if (!result.ok) {
      if (result.reason === "blocked") {
        toast.error("Your account is on hold because of a refund or chargeback. Contact support.");
        return;
      }
      setTopUp(result.reason === "free_used" ? "free_used" : "no_credit");
      return;
    }

    setAllowance(result.allowanceSeconds);
    setCallMode(result.mode === "free" ? "free" : "paid");
    setActiveCallId(result.callId);
    setUnavailable(null);
    setActiveCall(l);

    try {
      const call = await voice.connect({
        CallerIdentity: voice.identity ?? "",
        TargetIdentity: dial.toIdentity,
        DialAuth: dial.dialAuth,
        CallRecordId: result.callId,
      });
      if (call) {
        call.on("disconnect", () => setVoiceCall(null));
        setVoiceCall(call);
      }
    } catch (err) {
      console.error("[voice] could not start audio", err);
      toast.error("Could not start audio. Check your microphone permission.");
    }
  };

  const handleTick = async () => {
    const callId = activeCallId;
    if (!callId) return null;
    try {
      const status = await beat({ data: { callId } });
      return {
        remaining: status.remaining,
        shouldEnd: status.shouldEnd,
        answered: status.answered,
        status: status.status,
      };
    } catch (err) {
      console.error("[call] heartbeat failed", err);
      return null;
    }
  };

  /** Ringing ended without a live agent: nothing was billed. */
  const handleNoAnswer = async () => {
    const callId = activeCallId;
    const listener = activeCall;
    voiceCall?.disconnect();
    setVoiceCall(null);
    setActiveCall(null);
    setActiveCallId(null);
    if (callId) {
      try {
        await finish({ data: { callId } });
      } catch (err) {
        console.error("[call] could not close ringing call", err);
      }
    }
    if (listener) {
      toast.error(`${listener.displayName} is momenteel in gesprek`);
      setUnavailable(listener);
    }
  };

  const handleEnd = async () => {
    const callId = activeCallId;
    voiceCall?.disconnect();
    setVoiceCall(null);
    setActiveCall(null);
    setActiveCallId(null);
    if (!callId) return;
    const result = await finish({ data: { callId } });
    void queryClient.invalidateQueries({ queryKey: ["account"] });
    toast.success(
      `Call ended · ${Math.floor(result.billed / 60)}m ${result.billed % 60}s · € ${(result.cost / 100).toFixed(2)}`,
    );
    if (result.freeLeft <= 0 && result.paidLeft <= 0) {
      setTopUp(callMode === "free" ? "free_used" : "no_credit");
    }
  };

  const startFirstAvailable = () => {
    const first = onlineList[0];
    if (first) {
      void handleCall(first);
      return;
    }
    setUnavailable(list[0] ?? null);
  };

  return (
    <div className="min-h-screen font-body">
      <Header />
      <main>
        <Hero onStart={startFirstAvailable} />

        <section id="listeners" className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {t("listeners.title")}
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">{t("listeners.subtitle")}</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((l) => (
              <ListenerCard key={l.id} listener={l} onCall={(x) => void handleCall(x)} />
            ))}
          </div>
        </section>

        <HowItWorks />
        <Pricing />
        <Faq />
        <ContactSection />
      </main>
      <Footer />

      <ActiveCallDialog
        listener={activeCall}
        allowanceSeconds={allowance}
        mode={callMode}
        call={voiceCall}
        onTick={handleTick}
        onEnd={() => void handleEnd()}
        onNoAnswer={() => void handleNoAnswer()}
      />
      <UnavailableDialog
        listener={unavailable}
        available={onlineList}
        waiting={waitingForListener}
        onJoinWaitlist={() => {
          setWaitingForListener(true);
          void listenersQuery.refetch();
          toast.success("You're in the waiting line — keep this tab open.");
        }}
        onClose={() => setUnavailable(null)}
        onPick={(l) => void handleCall(l)}
      />
      <TopUpDialog open={!!topUp} reason={topUp ?? "no_credit"} onClose={() => setTopUp(null)} />
    </div>
  );
}
