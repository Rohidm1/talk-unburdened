import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { toast } from "sonner";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { FloatingChat } from "@/components/site/FloatingChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const title = "Daily Dilemma – Pick a Side, See What Others Think | Anontalk";
const description =
  "One tough moral question a day. Vote anonymously, then see the results and the best arguments on both sides.";

export const Route = createFileRoute("/dilemma")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://anontalk.online/dilemma" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://anontalk.online/dilemma" }],
  }),
  component: DilemmaPage,
});

function DilemmaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [arg, setArg] = useState("");

  const dilemma = useQuery({
    queryKey: ["dilemma-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("dilemmas").select("*").lte("day", today).order("day", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const d = dilemma.data;

  const myVote = useQuery({
    queryKey: ["dilemma-vote", d?.id, user?.id],
    enabled: !!d && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("dilemma_votes").select("choice").eq("dilemma_id", d!.id).eq("user_id", user!.id).maybeSingle();
      return (data?.choice as "a" | "b" | undefined) ?? null;
    },
  });
  const voted = myVote.data ?? null;

  const results = useQuery({
    queryKey: ["dilemma-results", d?.id],
    enabled: !!voted,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await supabase.rpc("dilemma_results", { _dilemma_id: d!.id });
      return (data as { votes_a: number; votes_b: number }[] | null)?.[0] ?? { votes_a: 0, votes_b: 0 };
    },
  });

  const args = useQuery({
    queryKey: ["dilemma-args", d?.id],
    enabled: !!voted,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await supabase.from("dilemma_arguments").select("id, side, body, score, created_at").eq("dilemma_id", d!.id).order("score", { ascending: false }).limit(60);
      return data ?? [];
    },
  });

  async function vote(choice: "a" | "b") {
    if (!user || !d) return;
    const { error } = await supabase.from("dilemma_votes").insert({ dilemma_id: d.id, user_id: user.id, choice });
    if (error) return toast.error("Could not save your vote.");
    await qc.invalidateQueries({ queryKey: ["dilemma-vote"] });
  }

  async function post() {
    if (!user || !d || !voted) return;
    const body = arg.trim();
    if (body.length < 3) return;
    const { error } = await supabase.from("dilemma_arguments").insert({ dilemma_id: d.id, user_id: user.id, side: voted, body });
    if (error) return toast.error("Could not post your argument.");
    setArg("");
    await qc.invalidateQueries({ queryKey: ["dilemma-args"] });
  }

  async function rate(id: string, value: 1 | -1) {
    await supabase.rpc("vote_argument", { _argument_id: id, _value: value });
    await qc.invalidateQueries({ queryKey: ["dilemma-args"] });
  }

  const total = (results.data?.votes_a ?? 0) + (results.data?.votes_b ?? 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <FloatingChat />
      <main className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Today's dilemma</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {d?.question ?? "Loading…"}
        </h1>

        {d ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(["a", "b"] as const).map((side) => {
              const label = side === "a" ? d.option_a : d.option_b;
              const n = side === "a" ? results.data?.votes_a ?? 0 : results.data?.votes_b ?? 0;
              return (
                <button
                  key={side}
                  type="button"
                  disabled={!!voted || !user}
                  onClick={() => void vote(side)}
                  className={`relative overflow-hidden rounded-3xl border p-6 text-left transition-colors ${voted === side ? "border-primary" : "border-border"} bg-card enabled:hover:border-primary`}
                >
                  {voted ? <span className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-700" style={{ width: `${pct(n)}%` }} /> : null}
                  <span className="relative font-display text-lg font-semibold">{label}</span>
                  {voted ? <span className="relative mt-2 block text-3xl tabular-nums">{pct(n)}%</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {!user ? (
          <p className="mt-6 text-sm">
            <Link to="/auth" search={{ redirect: "/dilemma" }} className="text-primary underline">Sign in</Link> to vote anonymously and see the results.
          </p>
        ) : voted ? (
          <section className="mt-10">
            <p className="text-sm text-muted-foreground">{total} votes so far</p>
            <h2 className="mt-4 font-display text-xl font-semibold">Argument wall</h2>
            <div className="mt-3 flex gap-2">
              <input value={arg} onChange={(e) => setArg(e.target.value.slice(0, 280))} placeholder="Why did you pick that side?" className="flex-1 rounded-2xl border border-input bg-background/50 px-3 py-2 text-sm" />
              <button type="button" onClick={post} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Post</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["a", "b"] as const).map((side) => (
                <div key={side} className="space-y-3">
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{side === "a" ? d?.option_a : d?.option_b}</p>
                  {(args.data ?? []).filter((a) => a.side === side).map((a) => (
                    <div key={a.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                      <div className="flex flex-col items-center text-xs">
                        <button type="button" aria-label="Upvote" onClick={() => void rate(a.id, 1)}><ArrowBigUp className="size-5" /></button>
                        <span className="tabular-nums">{a.score}</span>
                        <button type="button" aria-label="Downvote" onClick={() => void rate(a.id, -1)}><ArrowBigDown className="size-5" /></button>
                      </div>
                      <p className="text-sm">{a.body}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
