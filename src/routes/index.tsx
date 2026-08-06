import { useMemo, useState } from "react";
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
import { ContactSection, Faq, Footer, HowItWorks, Pricing } from "@/components/site/Sections";
import { listeners as fallbackListeners, type Listener } from "@/data/listeners";
import { listPublicListeners } from "@/lib/listeners.functions";
import { endCall, getMyAccount, startCall } from "@/lib/account.functions";
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
  const prepare = useServerFn(prepareDial);
  const voice = useTwilioDevice(!!session);

  const [activeCall, setActiveCall] = useState<Listener | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<Listener | null>(null);
  const [balance, setBalance] = useState(0);
  const [voiceCall, setVoiceCall] = useState<Call | null>(null);

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

  const handleCall = async (l: Listener) => {
    if (!session) {
      void navigate({ to: "/auth" });
      return;
    }
    if (l.status !== "online") {
      setUnavailable(l);
      return;
    }
    const result = await begin({ data: { listenerId: l.id } });
    if (!result.ok) {
      toast.error("You're out of talk credit. Top up on your account page.");
      void navigate({ to: "/account" });
      return;
    }
    setBalance(result.balance);
    setActiveCallId(result.callId);
    setUnavailable(null);
    setActiveCall(l);

    try {
      const dial = await prepare({ data: { listenerId: l.id } });
      if (dial.ready && dial.toIdentity && dial.dialAuth && voice.ready && voice.identity) {
        const call = await voice.connect({
          CallerIdentity: voice.identity,
          TargetIdentity: dial.toIdentity,
          DialAuth: dial.dialAuth,
        });
        if (call) {
          call.on("disconnect", () => setVoiceCall(null));
          setVoiceCall(call);
        }
      }
    } catch (err) {
      console.error("[voice] could not start audio", err);
      toast.error("Could not start audio. Check your microphone permission.");
    }
  };

  const handleEnd = async (elapsed: number) => {
    const callId = activeCallId;
    voiceCall?.disconnect();
    setVoiceCall(null);
    setActiveCall(null);
    setActiveCallId(null);
    if (!callId) return;
    const result = await finish({ data: { callId, durationSeconds: elapsed } });
    void queryClient.invalidateQueries({ queryKey: ["account"] });
    toast.success(
      `Call ended · ${Math.floor(result.billed / 60)}m ${result.billed % 60}s · € ${(result.cost / 100).toFixed(2)}`,
    );
  };

  const startFirstAvailable = () => {
    const first = list.find((l) => l.status === "online");
    if (first) void handleCall(first);
  };

  const creditSeconds = account.data?.profile?.credit_seconds ?? 0;

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
        balanceSeconds={balance || creditSeconds}
        call={voiceCall}
        audioLive={!!voiceCall}
        onEnd={(elapsed) => void handleEnd(elapsed)}
      />
      <UnavailableDialog
        listener={unavailable}
        available={list.filter((l) => l.status === "online")}
        onClose={() => setUnavailable(null)}
        onPick={(l) => void handleCall(l)}
      />
    </div>
  );
}
