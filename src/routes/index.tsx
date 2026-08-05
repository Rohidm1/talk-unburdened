import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { ListenerCard } from "@/components/site/ListenerCard";
import { ActiveCallDialog, UnavailableDialog } from "@/components/site/CallDialogs";
import { ContactSection, Faq, Footer, HowItWorks, Pricing } from "@/components/site/Sections";
import { listeners, type Listener } from "@/data/listeners";

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
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const [activeCall, setActiveCall] = useState<Listener | null>(null);
  const [unavailable, setUnavailable] = useState<Listener | null>(null);

  const handleCall = (l: Listener) => {
    if (l.status === "online") {
      setUnavailable(null);
      setActiveCall(l);
    } else {
      setUnavailable(l);
    }
  };

  const startFirstAvailable = () => {
    const first = listeners.find((l) => l.status === "online");
    if (first) setActiveCall(first);
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
            {listeners.map((l) => (
              <ListenerCard key={l.id} listener={l} onCall={handleCall} />
            ))}
          </div>
        </section>

        <HowItWorks />
        <Pricing />
        <Faq />
        <ContactSection />
      </main>
      <Footer />

      <ActiveCallDialog listener={activeCall} onClose={() => setActiveCall(null)} />
      <UnavailableDialog
        listener={unavailable}
        onClose={() => setUnavailable(null)}
        onPick={handleCall}
      />
    </div>
  );
}
