import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { toast } from "sonner";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { FloatingChat } from "@/components/site/FloatingChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicDilemma } from "@/lib/dilemma-public";
export function DilemmaExperience({ dilemma: d, archive = [] }: { dilemma: PublicDilemma | null; archive?: PublicDilemma[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [arg, setArg] = useState("");

  const myVote = useQuery({
    queryKey: ["dilemma-vote", d?.id, user?.id],
    enabled: !!d && !!user,
    queryFn: async () => {
      if (!d || !user) return null;
      const { data } = await supabase.from("dilemma_votes").select("choice").eq("dilemma_id", d.id).eq("user_id", user.id).maybeSingle();
      return (data?.choice as "a" | "b" | undefined) ?? null;
    },
  });
  const voted = myVote.data ?? null;

  const results = useQuery({
    queryKey: ["dilemma-results", d?.id],
    enabled: !!voted,
    refetchInterval: 20000,
    queryFn: async () => {
      if (!d) return { votes_a: 0, votes_b: 0 };
      const { data } = await supabase.rpc("dilemma_results", { _dilemma_id: d.id });
      return (data as { votes_a: number; votes_b: number }[] | null)?.[0] ?? { votes_a: 0, votes_b: 0 };
    },
  });

  const args = useQuery({
    queryKey: ["dilemma-args", d?.id],
    enabled: !!voted,
    refetchInterval: 20000,
    queryFn: async () => {
      if (!d) return [];
      const { data } = await supabase.from("dilemma_arguments").select("id, side, body, score, created_at").eq("dilemma_id", d.id).order("score", { ascending: false }).limit(60);
      return data ?? [];
    },
  });

  async function vote(choice: "a" | "b") {
    if (!user || !d) return;
    const { error } = await supabase.from("dilemma_votes").insert({ dilemma_id: d.id, user_id: user.id, choice });
    if (error) { toast.error("Could not save your vote."); return; }
    await qc.invalidateQueries({ queryKey: ["dilemma-vote"] });
  }

  async function post() {
    if (!user || !d || !voted) return;
    const body = arg.trim();
    if (body.length < 3) return;
    const { error } = await supabase.from("dilemma_arguments").insert({ dilemma_id: d.id, user_id: user.id, side: voted, body });
    if (error) { toast.error("Could not post your argument."); return; }
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
        {archive.length > 0 ? (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Daily Dilemmas: everyday choices, both sides</h1>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Each day brings one new question about friendship, honesty, work or family. Read it without an account, then sign in to vote under your nickname and share an argument for either side.
            </p>
            <p className="mt-10 text-xs font-semibold tracking-widest text-primary uppercase">Today's dilemma</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {d?.question ?? "No public dilemma yet"}
            </h2>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">Dilemma</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {d?.question ?? "No public dilemma yet"}
            </h1>
          </>
        )}

        {d ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(["a", "b"] as const).map((side) => {
              const label = side === "a" ? d.option_a : d.option_b;
              const n = side === "a" ? results.data?.votes_a ?? 0 : results.data?.votes_b ?? 0;
              return (
                <Button
                  variant="outline"
                  key={side}
                  type="button"
                  disabled={!!voted || !user}
                  onClick={() => void vote(side)}
                  className={`relative h-auto min-h-24 flex-col items-start overflow-hidden whitespace-normal rounded-lg border p-6 text-left text-foreground transition-colors disabled:opacity-100 ${voted === side ? "border-primary" : "border-border"} bg-card enabled:hover:border-primary`}
                >
                  {voted ? <span className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-700" style={{ width: `${pct(n)}%` }} /> : null}
                  <span className="relative font-display text-lg font-semibold">{label}</span>
                  {voted ? <span className="relative mt-2 block text-3xl tabular-nums">{pct(n)}%</span> : null}
                </Button>
              );
            })}
          </div>
        ) : null}

        {!user ? (
          <p className="mt-6 text-sm">
            <Link to="/auth" search={{ redirect: "/dilemma" }} className="text-primary underline">Sign in</Link> to vote under your nickname and see the results.
          </p>
        ) : voted ? (
          <section className="mt-10">
            <p className="text-sm text-muted-foreground">{total} votes so far</p>
            <h2 className="mt-4 font-display text-xl font-semibold">Argument wall</h2>
            <div className="mt-3 flex gap-2">
              <Input aria-label="Your argument" value={arg} onChange={(e) => setArg(e.target.value.slice(0, 280))} placeholder="Why did you pick that side?" className="flex-1 rounded-2xl border border-input bg-background/50 px-3 py-2 text-sm" />
              <Button type="button" onClick={post} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Post</Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["a", "b"] as const).map((side) => (
                <div key={side} className="space-y-3">
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{side === "a" ? d?.option_a : d?.option_b}</p>
                  {(args.data ?? []).filter((a) => a.side === side).map((a) => (
                    <div key={a.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                      <div className="flex flex-col items-center text-xs">
                        <Button variant="ghost" size="icon" type="button" aria-label="Upvote" onClick={() => void rate(a.id, 1)}><ArrowBigUp className="size-5" /></Button>
                        <span className="tabular-nums">{a.score}</span>
                        <Button variant="ghost" size="icon" type="button" aria-label="Downvote" onClick={() => void rate(a.id, -1)}><ArrowBigDown className="size-5" /></Button>
                      </div>
                      <p className="text-sm">{a.body}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {archive.length > 0 ? (
          <section aria-labelledby="dilemma-archive" className="mt-14">
            <h2 id="dilemma-archive" className="font-display text-2xl font-semibold">Explore public dilemmas</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {archive.map((item) => (
                <li key={item.id}>
                  <Link to="/dilemma/$id" params={{ id: item.id }} className="block h-full rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary">
                    <time dateTime={item.day} className="text-xs text-muted-foreground">{item.day}</time>
                    <h3 className="mt-2 font-display font-semibold">{item.question}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.option_a} · {item.option_b}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
