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
} from "@/components/site/Sections";
import { listeners as fallbackListeners, type Listener } from "@/data/listeners";
import { getMyAccount } from "@/lib/account.functions";
import { endChat, startChat } from "@/lib/chat.functions";
import { avatarFor } from "@/lib/avatars";
import { useAuth } from "@/hooks/useAuth";
import { CreditCheckoutDialog } from "@/components/site/CreditCheckoutDialog";
import type { CreditPackageKey } from "@/lib/credit-packages";

const title = "Anontalk — Anonymous live chat with a listening ear";
const description =
  "Talk it out anonymously. Anontalk connects men in Belgium, the Netherlands and the US with warm listeners over a safe browser chat. First 3 messages free.";

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
                text: "Yes. You choose an alias, and that's the only thing your listener ever sees. We never ask for your real name, address or phone number.",
              },
            },
            {
              "@type": "Question",
              name: "Are your listeners professionals?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No — and we're upfront about that. Our listeners are trained, warm people who give you their full attention. They offer a listening ear and everyday perspective, not professional advice.",
              },
            },
            {
              "@type": "Question",
              name: "How do the 3 free messages work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Every new account gets 3 free messages on the very first chat. No credit card needed. When they run out you can top up or simply close the chat.",
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
                text: "Open a listener's profile and press Chat. The listener accepts your request and from that moment you type back and forth in real time. You can end the chat whenever you like.",
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
  const start = useServerFn(startChat);
  const stop = useServerFn(endChat);

  const [activeListener, setActiveListener] = useState<Listener | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<"paid" | "free">("paid");
  const [allowance, setAllowance] = useState(0);
  const [topUpReason, setTopUpReason] = useState<"free_used" | "no_credit" | null>(null);
  const [checkoutKey, setCheckoutKey] = useState<CreditPackageKey | null>(null);

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount(), enabled: !!user });

  const profile = account.data?.profile;
  const totalCredits = (profile?.chat_credits ?? 0) + (profile?.free_credits ?? 0);

  const listenersOnline = fallbackListeners.map((l) => ({ ...l, status: "online" as const }));

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
    const result = await start({ data: { listenerId: listener.id } });
    if (!result.ok) {
      setActiveListener(null);
      if (result.reason === "blocked") {
        toast.error("Your account is on hold.");
      } else if (result.reason === "free_used" || result.reason === "no_credit") {
        setTopUpReason(result.reason);
      } else {
        toast.error("No listener is available right now. Please try again in a moment.");
      }
      return;
    }
    setSessionId(result.sessionId);
    setSessionMode(result.mode);
    setAllowance(result.allowance);
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
        <Hero onStart={() => document.getElementById("listeners")?.scrollIntoView({ behavior: "smooth" })} />

        <section id="listeners" className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                {t("listeners.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("listeners.subtitle")}</p>
            </div>
            {user && totalCredits > 0 ? (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-sm tabular-nums">
                {totalCredits} credits
              </span>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listenersOnline.map((l: Listener) => (
              <ListenerCard key={l.id} listener={l} onChat={() => handleChat(l)} />
            ))}
          </div>
        </section>

        <ChatIntro />
        <HowItWorks />
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
