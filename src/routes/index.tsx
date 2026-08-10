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
  Faq,
  Footer,
  HowItWorks,
  Pricing,
  TrustStrip,
  Voices,
} from "@/components/site/Sections";
import { Reveal } from "@/components/site/Reveal";
import { listeners as fallbackListeners, type Listener } from "@/data/listeners";
import { getMyAccount } from "@/lib/account.functions";
import { endChat, startChat } from "@/lib/chat.functions";
import { listPublicListeners } from "@/lib/listeners.functions";
import { useAuth } from "@/hooks/useAuth";
import { CreditCheckoutDialog } from "@/components/site/CreditCheckoutDialog";
import type { CreditPackageKey } from "@/lib/credit-packages";

const title = "Anontalk - 100% Private & Anonymous Chat Platform.";
const description =
  "Anontalk: 100% private, anonymous live chat. Sign up to receive 5 free messages and chat instantly with real people, no forms, no waiting room.";

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
            {
              "@type": "Question",
              name: "Is it really anonymous?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You choose an alias, and that's the only thing your chat partner ever sees. We never ask for your real name, address or phone number.",
              },
            },
            {
              "@type": "Question",
              name: "Are your chat partners professionals?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No — and we're upfront about that. Our chat partners are warm, attentive people who take the time to read and reply. They offer everyday perspective, not professional advice.",
              },
            },
            {
              "@type": "Question",
              name: "How do the 5 free messages work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Every new account gets 5 free messages on the very first chat. No credit card needed. When they run out you can top up or simply close the chat.",
              },
            },
            {
              "@type": "Question",
              name: "How am I billed?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Each message you send costs 1 credit. Agent replies are always free. Bundles bring the price per message down.",
              },
            },
            {
              "@type": "Question",
              name: "Who can see that I chatted?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Nobody. Your payment description is neutral, chats run in the browser, and we never share anything with third parties.",
              },
            },
            {
              "@type": "Question",
              name: "How does chatting work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Open a profile and press Chat. Your chat partner accepts the request and from that moment you type back and forth in real time. You can end the chat whenever you like.",
              },
            },
            {
              "@type": "Question",
              name: "Do my credits expire?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Once purchased, your credits stay on your account until you use them.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    setActiveListener(listener);
    try {
      const result = await start({ data: { listenerId: listener.id } });
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
      setSessionId(result.sessionId);
      setSessionMode(result.mode);
      setAllowance(result.allowance);
    } catch {
      setActiveListener(null);
      toast.error("The chat could not be started. Please refresh and try again.");
    }
  }

  async function handleChatEnd(reason: "user" | "out_of_credit" | "closed") {
    if (sessionId) {
      try {
        await stop({ data: { sessionId } });
      } catch {
        /* ignore */
      }
    }
    setActiveListener(null);
    setSessionId(null);
    if (reason === "out_of_credit") {
      setTopUpReason("no_credit");
    }
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <main>
        <Hero
          onStart={() =>
            document.getElementById("listeners")?.scrollIntoView({ behavior: "smooth" })
          }
        />

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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listenersOnline.map((l: Listener, i: number) => (
              <Reveal key={l.id} delay={0.05 * (i % 3)}>
                <ListenerCard listener={l} onChat={() => handleChat(l)} />
              </Reveal>
            ))}
          </div>
        </section>

        <ChatIntro />
        <HowItWorks />
        <TrustStrip />
        <Voices />
        <Pricing />
        <Faq />
        <ContactSection />
      </main>
      <Footer />

      <ChatDialog
        listener={activeListener}
        sessionId={sessionId}
        mode={sessionMode}
        allowance={allowance}
        onEnd={handleChatEnd}
      />

      <TopUpDialog
        open={topUpReason !== null}
        reason={topUpReason ?? "no_credit"}
        onClose={() => setTopUpReason(null)}
      />

      <CreditCheckoutDialog packageKey={checkoutKey} onClose={() => setCheckoutKey(null)} />
    </div>
  );
}
