import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { ParticleField } from "@/components/site/ParticleField";
import { XpLayer } from "@/components/site/XpLayer";
import { articles, type Article } from "@/data/articles";
import { markArticleRead, useProgress } from "@/lib/gamification";
import { playSfx } from "@/lib/sfx";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "Mental Health Hub - Anontalk Anonymous Chat" },
      {
        name: "description",
        content:
          "Ten short, practical reads on anonymous venting, loneliness, empathy and safe online vulnerability. Earn XP on Anontalk for every article you finish.",
      },
      { property: "og:title", content: "Mental Health Hub - Anontalk Anonymous Chat" },
      {
        property: "og:description",
        content:
          "Ten short reads on venting, loneliness, empathy and safe online vulnerability - earn XP for every article you finish.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const { progress } = useProgress();
  const [open, setOpen] = useState<Article | null>(null);

  const read = (a: Article) => {
    setOpen(a);
    if (markArticleRead(a.slug)) playSfx("xp");
    else playSfx("click");
  };

  return (
    <div className="relative min-h-screen">
      <ParticleField />
      <XpLayer />
      <Header />

      <main className="mx-auto w-full max-w-5xl px-5 py-16">
        {open ? (
          <article className="glass rounded-3xl p-7 md:p-10">
            <Button variant="ghost" size="sm" onClick={() => setOpen(null)} className="-ml-2">
              <ArrowLeft className="size-4" /> Back to the hub
            </Button>
            <h1 className="mt-4 font-display text-3xl font-semibold text-balance md:text-4xl">
              {open.title}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> {open.minutes} min read · +20 XP
            </p>
            <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
              {open.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </article>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-neon-cyan">
              <BookOpen className="size-4" /> Mental Health Hub
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-balance md:text-5xl">
              Short reads that make opening up easier
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Peer perspective, not treatment. Every article you finish rewards +20 XP.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {articles.map((a) => {
                const done = progress.readArticles.includes(a.slug);
                return (
                  <button
                    key={a.slug}
                    onClick={() => read(a)}
                    className="glass neon-glow rounded-3xl p-6 text-left hover:border-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-lg font-semibold text-balance">{a.title}</h2>
                      {done ? (
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" />
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-neon-cyan/40 px-2 py-0.5 text-xs text-neon-cyan">
                          +20 XP
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{a.teaser}</p>
                    <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" /> {a.minutes} min read
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}