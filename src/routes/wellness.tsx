import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { FloatingChat } from "@/components/site/FloatingChat";
import { LifeBuoy } from "lucide-react";
import { Affirmations, Grounding, Journal, MoodTracker } from "@/components/site/WellnessToolkit";
import { openSos } from "@/lib/safety";

const title = "Wellness Toolkit – Breathing, Grounding, Journal & Mood | Anontalk";
const description =
  "Free wellness tools: Mood SOS breathing, 5-4-3-2-1 grounding, journaling prompts, affirmations and a private daily mood tracker.";

export const Route = createFileRoute("/wellness")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://anontalk.online/wellness" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://anontalk.online/wellness" }],
  }),
  component: WellnessPage,
});

const PHASES = ["Breathe in", "Hold", "Breathe out", "Hold"] as const;

function BoxBreathing() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(4);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        setPhase((p) => (p + 1) % 4);
        navigator.vibrate?.(40);
        return 4;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const big = phase === 0 || phase === 1;
  return (
    <section className="glass rounded-3xl p-6 text-center">
      <h2 className="font-display text-xl font-semibold">Box breathing</h2>
      <p className="mt-1 text-sm text-muted-foreground">4 seconds in, hold, out, hold. Repeat a few rounds.</p>
      <div className="my-8 flex h-56 items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full bg-primary/20 shadow-[var(--shadow-glow)] ring-2 ring-primary transition-all ease-in-out"
          style={{
            width: running && big ? 208 : 112,
            height: running && big ? 208 : 112,
            transitionDuration: phase === 0 || phase === 2 ? "4000ms" : "300ms",
          }}
        >
          <div className="text-center">
            <p className="font-display text-sm font-semibold">{running ? PHASES[phase] : "Ready"}</p>
            {running ? <p className="text-3xl tabular-nums">{count}</p> : null}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setPhase(0);
          setCount(4);
          setRunning((r) => !r);
        }}
        className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
      >
        {running ? "Stop" : "Start"}
      </button>
    </section>
  );
}

function Shredder() {
  const [text, setText] = useState("");
  const [shredding, setShredding] = useState<string | null>(null);

  function shred() {
    if (!text.trim()) return;
    setShredding(text);
    setText("");
    navigator.vibrate?.([30, 40, 30]);
    window.setTimeout(() => setShredding(null), 1800);
  }

  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="font-display text-xl font-semibold">Vent & shred</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Type what's weighing on you, then shred it. Nothing is saved — it's gone.
      </p>
      <div className="relative mt-4 min-h-40">
        {shredding ? (
          <div className="flex gap-1 overflow-hidden" aria-live="polite">
            {Array.from({ length: 10 }).map((_, i) => (
              <p
                key={i}
                className="shred-strip w-[10%] overflow-hidden whitespace-pre-wrap break-all text-sm text-muted-foreground"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {shredding.slice(i * Math.ceil(shredding.length / 10), (i + 1) * Math.ceil(shredding.length / 10))}
              </p>
            ))}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Today I'm frustrated because…"
            className="w-full rounded-2xl border border-input bg-background/50 p-3 text-sm"
          />
        )}
      </div>
      <button
        type="button"
        onClick={shred}
        disabled={!!shredding}
        className="mt-3 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {shredding ? "Shredding…" : "Shred it"}
      </button>
    </section>
  );
}

type Node = { q: string; options: { label: string; next?: string; tip?: string }[] };
const TREE: Record<string, Node> = {
  start: {
    q: "How are you feeling right now?",
    options: [
      { label: "Stressed", next: "stress" },
      { label: "Lonely", next: "lonely" },
      { label: "Restless / can't sleep", next: "restless" },
      { label: "Okay, just bored", tip: "Try today's dilemma — pick a side and see what others think." },
    ],
  },
  stress: {
    q: "Is it something you can act on today?",
    options: [
      { label: "Yes", tip: "Write the one smallest next step, set a 10-minute timer, and do only that." },
      { label: "No, out of my hands", tip: "Do two rounds of box breathing, then shred the thought above." },
    ],
  },
  lonely: {
    q: "Would talking to someone help?",
    options: [
      { label: "Yes", tip: "A chat partner is online now — your first 5 messages are free." },
      { label: "Not yet", tip: "Drop a message in a bottle. Someone will send an echo back." },
    ],
  },
  restless: {
    q: "Is your mind racing with thoughts?",
    options: [
      { label: "Yes", tip: "Shred the loop of thoughts, then breathe out longer than you breathe in." },
      { label: "Just physically restless", tip: "Stand up, stretch for 60 seconds, drink some water." },
    ],
  },
};

function MindUnwind() {
  const [node, setNode] = useState("start");
  const [tip, setTip] = useState<string | null>(null);
  const current = TREE[node]!;
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="font-display text-xl font-semibold">Mind unwind</h2>
      {tip ? (
        <div className="mt-4">
          <p className="text-sm">{tip}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/" search={{ chat: 1 }} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Talk to someone
            </Link>
            <button type="button" className="rounded-full border border-border px-4 py-2 text-sm" onClick={() => { setTip(null); setNode("start"); }}>
              Start over
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{current.q}</p>
          <div className="mt-4 grid gap-2">
            {current.options.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => (o.next ? setNode(o.next) : setTip(o.tip ?? null))}
                className="rounded-2xl border border-border bg-background/40 px-4 py-3 text-left text-sm transition-colors hover:border-primary"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function WellnessPage() {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <FloatingChat />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Two minutes for yourself</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Small exercises to slow down. Everyday tools, not medical advice.
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <BoxBreathing />
          <Shredder />
          <MindUnwind />
        </div>
        <section className="mt-10 rounded-3xl border border-primary/40 bg-primary/10 p-6 text-center">
          <h2 className="font-display text-2xl font-semibold">Panicking or overwhelmed right now?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mood SOS: one guided minute of calm breathing. Do it 3 days in a row for a little surprise.</p>
          <button type="button" onClick={openSos} className="glow-cta mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">
            <LifeBuoy className="size-5" /> Start Mood SOS
          </button>
        </section>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <Grounding />
          <Journal />
          <Affirmations />
          <MoodTracker />
        </div>
      </main>
      <Footer />
    </div>
  );
}
