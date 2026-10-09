import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { FloatingChat } from "@/components/site/FloatingChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const title = "Message in a Bottle – Share Anonymously | Anontalk";
const description =
  "Drop an anonymous message into the ocean, fish up someone else's, and send a kind echo back. No names, ever.";

export const Route = createFileRoute("/bottles")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://anontalk.online/bottles" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://anontalk.online/bottles" }],
  }),
  component: BottlesPage,
});

type Fished = { id: string; body: string; echo_count: number; created_at: string };

function Ocean({ onFish, busy }: { onFish: () => void; busy: boolean }) {
  return (
    <div className="ocean relative h-64 overflow-hidden rounded-3xl border border-border">
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="bottle-float absolute text-3xl"
          style={{ left: `${8 + i * 13}%`, top: `${30 + ((i * 37) % 40)}%`, animationDelay: `${i * 0.7}s` }}
        >
          🍾
        </span>
      ))}
      <button
        type="button"
        onClick={onFish}
        disabled={busy}
        className="glow-cta absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Fishing…" : "Fish up a bottle"}
      </button>
    </div>
  );
}

function BottlesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [fished, setFished] = useState<Fished | null>(null);
  const [echo, setEcho] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = useQuery({
    queryKey: ["my-bottles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bottles")
        .select("id, body, echo_count, created_at, bottle_echoes(id, body, created_at)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  async function drop() {
    if (!user) return;
    const body = draft.trim();
    if (body.length < 3) return;
    const { error } = await supabase.from("bottles").insert({ user_id: user.id, body });
    if (error) {
      toast.error(error.message.includes("daily_limit") ? "You can drop 2 bottles a day. Come back tomorrow!" : "Could not drop your bottle.");
      return;
    }
    setDraft("");
    toast.success("Your bottle is floating out to sea 🌊");
    void qc.invalidateQueries({ queryKey: ["my-bottles"] });
  }

  async function fish() {
    if (!user) return;
    setBusy(true);
    const { data } = await supabase.rpc("fish_bottle");
    setBusy(false);
    const b = (data as Fished[] | null)?.[0];
    if (!b) toast.info("The sea is quiet right now. Drop the first bottle!");
    setFished(b ?? null);
  }

  async function sendEcho() {
    if (!user || !fished) return;
    const body = echo.trim();
    if (body.length < 2) return;
    const { error } = await supabase.from("bottle_echoes").insert({ bottle_id: fished.id, user_id: user.id, body });
    if (error) { toast.error("Could not send your echo."); return; }
    setEcho("");
    setFished(null);
    toast.success("Echo sent. That might make someone's day.");
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <FloatingChat />
      <main className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Message in a bottle</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Say what you can't say out loud. Someone, somewhere, will read it and send an echo back.
        </p>

        {!user ? (
          <div className="glass mt-8 rounded-3xl p-6">
            <p className="text-sm">Sign in to drop and fish bottles — you stay anonymous.</p>
            <Link to="/auth" search={{ redirect: "/bottles" }} className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Sign in to start
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8"><Ocean onFish={fish} busy={busy} /></div>

            {fished ? (
              <section className="glass mt-6 rounded-3xl p-6">
                <p className="text-xs text-muted-foreground">A bottle washed up · {fished.echo_count} echoes</p>
                <p className="mt-3 whitespace-pre-wrap text-lg">“{fished.body}”</p>
                <textarea
                  value={echo}
                  onChange={(e) => setEcho(e.target.value.slice(0, 140))}
                  rows={2}
                  placeholder="Send a kind echo (max 140)"
                  className="mt-4 w-full rounded-2xl border border-input bg-background/50 p-3 text-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={sendEcho} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Send echo</button>
                  <Link to="/" search={{ chat: 1 }} className="rounded-full border border-border px-5 py-2 text-sm">Start an anonymous chat</Link>
                  <button type="button" onClick={() => setFished(null)} className="px-3 py-2 text-sm text-muted-foreground">Throw back</button>
                </div>
              </section>
            ) : null}

            <section className="glass mt-6 rounded-3xl p-6">
              <h2 className="font-display text-xl font-semibold">Drop a bottle</h2>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 280))}
                rows={3}
                placeholder="Something on your mind…"
                className="mt-3 w-full rounded-2xl border border-input bg-background/50 p-3 text-sm"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.length}/280 · 2 per day</span>
                <button type="button" onClick={drop} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Drop it in the sea</button>
              </div>
            </section>

            {mine.data?.length ? (
              <section className="mt-6">
                <h2 className="font-display text-xl font-semibold">Your bottles</h2>
                <div className="mt-3 space-y-3">
                  {mine.data.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-sm">“{b.body}”</p>
                      {b.bottle_echoes.map((e) => (
                        <p key={e.id} className="mt-2 border-l-2 border-primary pl-3 text-sm text-muted-foreground">{e.body}</p>
                      ))}
                      {!b.bottle_echoes.length ? <p className="mt-2 text-xs text-muted-foreground">Still floating… no echoes yet.</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
