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
import { ChatDialog } from "@/components/site/ChatDialog";
import { TopUpDialog } from "@/components/site/TopUpDialog";
import {
  ChatIntro,
  ContactSection,
  Faq,
  Footer,
  HowItWorks,
  Pricing,
} from "@/components/site/Sections";
import { listeners as fallbackListeners, type Listener } from "@/data/listeners";
import { listPublicListeners } from "@/lib/listeners.functions";
import { endCall, getMyAccount, heartbeatCall, startCall } from "@/lib/account.functions";
import { prepareDial } from "@/lib/voice.functions";
import { endChat, startChat } from "@/lib/chat.functions";
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
              "How does chatting work?",
              "Open a listener's profile and press Chat instead of Call. The listener accepts your request and from that moment you type back and forth in real time. You can end the chat whenever you like.",
            ],
            [
              "Do I need separate credits for chat?",
              "No. Calling and chatting share one credit balance. Every bundle works for both — credits are stored as time, not as call-only or chat-only minutes.",
            ],
            [
              "How are chat minutes deducted?",
              "Chat costs EUR 0.65 per minute, billed per second while the session is active, counting from the moment your listener accepts. Free minutes are used first, then paid credits.",
            ],
            [
              "Can I switch between calling and chatting?",
              "Yes. Chat first and call later the same day, or the other way round. Your balance keeps counting down at the rate of whatever you are using at that moment.",
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
  const beginChat = useServerFn(startChat);
  const finishChat = useServerFn(endChat);
  const voice = useTwilioDevice(!!session);

  const [activeCall, setActiveCall] = useState<Listener | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<Listener | null>(null);
  const [waitingAhead, setWaitingAhead] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [callMode, setCallMode] = useState<"paid" | "free">("paid");
  const [voiceCall, setVoiceCall] = useState<Call | null>(null);
  const [waitingForListener, setWaitingForListener] = useState(false);
  const [topUp, setTopUp] = useState<"free_used" | "no_credit" | null>(null);
  const [chatListener, setChatListener] = useState<Listener | null>(null);
  const [chatSession, setChatSession] = useState<string | null>(null);
  const [chatAllowance, setChatAllowance] = useState(0);
  const [chatMode, setChatMode] = useState<"paid" | "free">("paid");
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
      setWaitingAhead(dial.waitingAhead ?? 0);
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
        call.on("error", (err: unknown) => console.error("[voice] call error", err));
        setVoiceCall(call);
      } else {
        throw new Error("no-call");
      }
    } catch (err) {
      console.error("[voice] could not start audio", err);
      toast.error(
        (err as Error)?.message === "microphone-denied"
          ? "Geef toegang tot je microfoon om te kunnen bellen."
          : "De audioverbinding kon niet worden gestart. Probeer het opnieuw.",
      );
      // Never leave the caller staring at a live-looking screen with no audio.
      setActiveCall(null);
      setActiveCallId(null);
      try {
        await finish({ data: { callId: result.callId } });
      } catch {
        /* nothing was billed while ringing */
      }
    }
  };

  const handleChat = async (l: Listener) => {
    if (!session) {
      void navigate({ to: "/auth" });
      return;
    }
    const result = await beginChat({ data: { listenerId: l.id } });
    if (!result.ok || !result.sessionId) {
      if (result.reason === "blocked") {
        toast.error("Your account is on hold because of a refund or chargeback. Contact support.");
        return;
      }
      if (result.reason === "busy") {
        toast.error(`${l.displayName} is momenteel in gesprek`);
        setUnavailable(l);
        return;
      }
      setTopUp(result.reason === "free_used" ? "free_used" : "no_credit");
      return;
    }
    setChatAllowance(result.allowanceSeconds);
    setChatMode(result.mode === "free" ? "free" : "paid");
    setChatListener(l);
    setChatSession(result.sessionId);
  };

  const handleChatEnd = async (reason: "user" | "out_of_credit" | "closed") => {
    const sessionId = chatSession;
    setChatSession(null);
    setChatListener(null);
    if (!sessionId) return;
    try {
      const result = await finishChat({ data: { sessionId } });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      if (result.billed > 0) {
        toast.success(
          `Chat beëindigd · ${Math.floor(result.billed / 60)}m ${result.billed % 60}s · € ${(result.cost / 100).toFixed(2)}`,
        );
      }
    } catch (err) {
      console.error("[chat] could not close session", err);
    }
    if (reason === "out_of_credit") setTopUp(chatMode === "free" ? "free_used" : "no_credit");
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
              <ListenerCard
                key={l.id}
                listener={l}
                onCall={(x) => void handleCall(x)}
                onChat={(x) => void handleChat(x)}
              />
            ))}
          </div>
        </section>

        <HowItWorks />
        <ChatIntro />
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
        waitingAhead={waitingAhead}
        onJoinWaitlist={() => {
          setWaitingForListener(true);
          void listenersQuery.refetch();
          toast.success("You're in the waiting line — keep this tab open.");
        }}
        onClose={() => setUnavailable(null)}
        onPick={(l) => void handleCall(l)}
      />
      <TopUpDialog open={!!topUp} reason={topUp ?? "no_credit"} onClose={() => setTopUp(null)} />
      <ChatDialog
        listener={chatListener}
        sessionId={chatSession}
        mode={chatMode}
        allowanceSeconds={chatAllowance}
        onEnd={(reason) => void handleChatEnd(reason)}
      />
    </div>
  );
}
