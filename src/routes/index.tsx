import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { ListenerCard } from "@/components/site/ListenerCard";
import { ChatDialog } from "@/components/site/ChatDialog";
import { TopUpDialog } from "@/components/site/TopUpDialog";
import {
  ChatIntro,
  ContactSection,
  Footer,
  HowItWorks,
  Pricing,
  TrustStrip,
} from "@/components/site/Sections";
import { ReviewsCarousel } from "@/components/site/Reviews";
import { FloatingChat } from "@/components/site/FloatingChat";
import { DailyCheckIn, SessionMilestones } from "@/components/site/Retention";
import { Reveal } from "@/components/site/Reveal";
import { ParticleField } from "@/components/site/ParticleField";
import { XpLayer } from "@/components/site/XpLayer";
import { ProgressWidget } from "@/components/site/ProgressWidget";
import { ComplimentDialog } from "@/components/site/ComplimentDialog";
import {
  MatchingRadar,
  MoodDialog,
  LiveActivityCounter,
  MatchGuarantee,
  type DepthId,
  type MoodId,
} from "@/components/site/MatchFlow";
import { IcebreakerQuiz } from "@/components/site/IcebreakerQuiz";
import { FirstMatchBonus, LiveChatTicker } from "@/components/site/Engagement";
import { logEngagement } from "@/lib/engagement";
import { playSfx } from "@/lib/sfx";
import { awardXp } from "@/lib/gamification";
import { listeners as fallbackListeners, type Listener } from "@/data/listeners";
import { getMyAccount } from "@/lib/account.functions";
import { endChat, startChat } from "@/lib/chat.functions";
import { listPublicListeners } from "@/lib/listeners.functions";
import { useAuth } from "@/hooks/useAuth";
import { CreditCheckoutDialog } from "@/components/site/CreditCheckoutDialog";
import { AdSenseSlot } from "@/components/site/AdSenseSlot";

import { DirectAnswer, HomeFaq } from "@/components/site/HomeAnswers";
import { homeTitle, homeDescription, homeAnswers } from "@/data/home-answers";
import { pageHead, jsonLd, faqSchema, websiteSchema } from "@/lib/seo";

import type { CreditPackageKey } from "@/lib/credit-packages";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { chat?: 1 } =>
    search["chat"] === 1 || search["chat"] === "1" ? { chat: 1 } : {},
  head: () => ({
    ...pageHead({ title: homeTitle, description: homeDescription, path: "/", language: "nl" }),
    scripts: [jsonLd(faqSchema(homeAnswers)), jsonLd(websiteSchema(homeDescription))],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { chat: autoChat } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchListeners = useServerFn(listPublicListeners);
  const start = useServerFn(startChat);
  const stop = useServerFn(endChat);

  const [activeListener, setActiveListener] = useState<Listener | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<"paid" | "free">("paid");
  const [allowance, setAllowance] = useState(0);
  const [topUpReason, setTopUpReason] = useState<"free_used" | "no_credit" | null>(null);
  const [checkoutKey, setCheckoutKey] = useState<CreditPackageKey | null>(null);
  const [pending, setPending] = useState<Listener | null>(null);
  const [mood, setMood] = useState<MoodId | null>(null);
  const [depth, setDepth] = useState<DepthId | null>(null);
  const [searching, setSearching] = useState(false);
  const [quizFor, setQuizFor] = useState<string | null>(null);
  const [compliment, setCompliment] = useState<string | null>(null);

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount(),
    enabled: !!user,
  });
  const publicListeners = useQuery({
    queryKey: ["public-listeners"],
    queryFn: () => fetchListeners(),
  });

  const profile = account.data?.profile;
  const totalCredits = (profile?.chat_credits ?? 0) + (profile?.free_credits ?? 0);

  const listenersOnline = useMemo(() => {
    const rowsByName = new Map((publicListeners.data ?? []).map((row) => [row.display_name, row]));
    return fallbackListeners.flatMap((listener) => {
      const row = rowsByName.get(listener.displayName);
      if (!row) return [];
      // A stand-in always covers the chat when no agent is around, so a
      // profile is never shown as offline.
      return [{ ...listener, id: row.id, status: row.status === "offline" ? "online" : row.status }];
    });
  }, [publicListeners.data]);

  useEffect(() => {
    // low-balance nudge only when not already in a chat
    if (!activeListener && totalCredits > 0 && totalCredits <= 2) {
      toast.info("Your credit is low. Buy a bundle to keep chatting.", {
        action: {
          label: "Top up",
          onClick: () => setTopUpReason("no_credit"),
        },
      });
    }
  }, [activeListener, totalCredits]);

  async function handleChat(listener: Listener) {
    if (!user) {
      await navigate({ to: "/auth", search: { redirect: "/" } });
      return;
    }
    playSfx("click");
    setPending(listener);
  }

  /** One-click start: picks whoever is free right now. */
  function quickChat() {
    const pool = listenersOnline.filter((l) => l.status === "online");
    const pick = (pool.length ? pool : listenersOnline)[
      Math.floor(Math.random() * Math.max(1, (pool.length ? pool : listenersOnline).length))
    ];
    if (!pick) {
      document.getElementById("listeners")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    void handleChat(pick);
  }

  // `/?chat=1` (from the floating button on other pages) opens the flow directly.
  const [autoStarted, setAutoStarted] = useState(false);
  useEffect(() => {
    if (!autoChat || autoStarted || authLoading || listenersOnline.length === 0) return;
    setAutoStarted(true);
    void navigate({ to: "/", search: {}, replace: true });
    quickChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoChat, autoStarted, authLoading, listenersOnline.length]);

  async function startMatched(listener: Listener) {
    setSearching(true);
    const minRadar = new Promise((r) => window.setTimeout(r, 2200));
    setActiveListener(listener);
    try {
      const result = await start({ data: { listenerId: listener.id } });
      await minRadar;
      setSearching(false);
      if (!result.ok) {
        setActiveListener(null);
        if (result.reason === "blocked") {
          toast.error("Your account is on hold.");
        } else if (result.reason === "free_used" || result.reason === "no_credit") {
          setTopUpReason(result.reason);
        } else {
          toast.error("No chat partner is available right now. Please try again in a moment.");
        }
        return;
      }
      playSfx("match");
      awardXp(15, "+15 XP · new match");
      logEngagement("match_started", { mood, depth, sessionId: result.sessionId });
      setQuizFor(listener.displayName);
      setSessionId(result.sessionId);
      setSessionMode(result.mode);
      setAllowance(result.allowance);
    } catch {
      setSearching(false);
      setActiveListener(null);
      toast.error("The chat could not be started. Please refresh and try again.");
    }
  }

  async function handleChatEnd(reason: "user" | "out_of_credit" | "closed") {
    const partner = activeListener?.displayName ?? null;
    if (sessionId) {
      try {
        await stop({ data: { sessionId } });
      } catch {
        /* ignore */
      }
      if (partner) setCompliment(partner);
    }
    setActiveListener(null);
    setSessionId(null);
    if (reason === "out_of_credit") {
      setTopUpReason("no_credit");
    }
  }

  return (
    <div className="relative min-h-screen font-body text-foreground">
      <ParticleField />
      <XpLayer />
      <SessionMilestones />
      <Header />
      <main>
        <Hero
          onStart={() =>
            document.getElementById("listeners")?.scrollIntoView({ behavior: "smooth" })
          }
        />

        <DirectAnswer />

        <section id="listeners" className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                {t("listeners.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("listeners.subtitle")}</p>
            </div>
            {user && totalCredits > 0 ? (
              <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-sm tabular-nums">
                {totalCredits} credits
              </span>
            ) : null}
          </div>

          <div className="mb-6">
            <LiveActivityCounter />
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <LiveChatTicker />
            <MatchGuarantee className="justify-self-start sm:justify-self-end" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listenersOnline.map((l: Listener, i: number) => (
              <Reveal key={l.id} delay={0.05 * (i % 3)}>
                <ListenerCard listener={l} onChat={() => handleChat(l)} />
              </Reveal>
            ))}
          </div>
        </section>

        <ChatIntro />
        <ProgressWidget />
        <HowItWorks />

        <section className="mx-auto max-w-4xl px-5 py-10">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sponsored
          </p>
          <AdSenseSlot
            client="ca-pub-5982787822958728"
            adSlot="8988406560"
            format="auto"
          />
        </section>

        <TrustStrip />
        <ReviewsCarousel />
        <section className="mx-auto w-full max-w-6xl px-5 pb-6">
          <div className="grid gap-5 md:grid-cols-[1fr_1.4fr] md:items-stretch">
            <DailyCheckIn />
            <div className="glass flex flex-col justify-center rounded-3xl p-6 md:p-8">
              <h2 className="font-display text-2xl font-semibold">Ready when you are</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                One tap connects you with whoever is free right now. No profile to fill in, no
                queue, and your first five messages cost nothing.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={quickChat}
                  className="glow-cta inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                >
                  Chat with someone now
                </button>
              </div>
            </div>
          </div>
        </section>
        <Pricing />
        <HomeFaq />
        <ContactSection />
      </main>
      <Footer />

      <ChatDialog
        listener={activeListener}
        sessionId={searching || quizFor ? null : sessionId}
        mode={sessionMode}
        allowance={allowance}
        onEnd={handleChatEnd}
      />

      <IcebreakerQuiz
        open={quizFor !== null}
        partnerName={quizFor ?? ""}
        onDone={() => setQuizFor(null)}
      />

      <MoodDialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onPick={(m, d) => {
          const listener = pending;
          setMood(m);
          setDepth(d);
          setPending(null);
          logEngagement("mood_selected", { mood: m });
          logEngagement("depth_selected", { mood: m, depth: d });
          if (listener) void startMatched(listener);
        }}
      />

      <MatchingRadar
        open={searching}
        mood={mood}
        partnerName={activeListener?.displayName}
        onCancel={() => {
          setSearching(false);
          setActiveListener(null);
          logEngagement("match_skipped", { mood, depth });
        }}
      />

      <ComplimentDialog
        open={compliment !== null}
        partnerName={compliment ?? ""}
        onClose={() => setCompliment(null)}
      />

      <TopUpDialog
        open={topUpReason !== null}
        reason={topUpReason ?? "no_credit"}
        onClose={() => setTopUpReason(null)}
      />

      <CreditCheckoutDialog packageKey={checkoutKey} onClose={() => setCheckoutKey(null)} />

      <FirstMatchBonus
        onStart={() =>
          document.getElementById("listeners")?.scrollIntoView({ behavior: "smooth" })
        }
      />

      {!activeListener && !searching ? <FloatingChat onStart={quickChat} /> : null}
    </div>
  );
}
