import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, EyeOff, Lock, MessageCircle, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Header } from "@/components/site/Header";
import { FloatingChat } from "@/components/site/FloatingChat";
import { Footer } from "@/components/site/Sections";
import { ParticleField } from "@/components/site/ParticleField";
import { Reveal } from "@/components/site/Reveal";

const title = "Vent to Someone Anonymously — Anontalk";
const description =
  "Need to vent to someone anonymously? Pick an alias and type it out on Anontalk, with team-run profiles and labelled AI fallback. Text only, no real name, 5 free messages to start.";
const url = "https://anontalk.online/vent-anonymously";

const faqs = [
  {
    q: "Can I really vent to someone without telling them who I am?",
    a: "Yes. You choose an alias when you sign up and that is the only thing your chat partner sees. We never show your real name, email or phone number.",
  },
  {
    q: "Who reads my messages?",
    a: "Speed Chat matches you with another real user; chat partner profiles are personas run by our team, and available team members have priority, with labelled AI fallback when none can handle the chat.",
  },
  {
    q: "Is venting online free?",
    a: "Your first 5 messages are free. After that each message you send costs 1 credit, and every reply you receive is free. No subscription.",
  },
  {
    q: "What can I vent about?",
    a: "Anything weighing on you: work, family, a breakup, loneliness, a bad day. We only ask that you stay respectful. Anontalk is peer conversation, not professional advice; if you are in danger, contact local emergency services.",
  },
];

export const Route = createFileRoute("/vent-anonymously")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: VentPage,
});

const reasons = [
  {
    icon: EyeOff,
    title: "Nobody knows it's you",
    body: "Venting to friends can feel risky. Here you're just an alias, so you can say exactly what you think.",
  },
  {
    icon: Moon,
    title: "Someone's there late at night",
    body: "The worst thoughts often show up at 2am. Check the home page to see who is online right now.",
  },
  {
    icon: Lock,
    title: "Phone numbers and emails get hidden",
    body: "If you type contact details by mistake, they are masked automatically before anyone sees them.",
  },
  {
    icon: Sparkles,
    title: "Try it free",
    body: "Your first 5 messages cost nothing and you don't need a card. See if it helps before spending anything.",
  },
];

const steps = [
  "Sign up with an alias. It takes about twenty seconds.",
  "Pick a chat partner who is online, or try Speed Chat.",
  "Type it all out. Your first 5 messages are free.",
];

function VentPage() {
  return (
    <div className="relative min-h-screen">
      <ParticleField />
      <Header />
      <FloatingChat />

      <main>
        <section className="mx-auto w-full max-w-4xl px-5 pt-16 pb-12 text-center md:pt-24">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Anonymous venting · Text only
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Vent to someone anonymously, right now
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Sometimes you just need to get it out. On Anontalk you pick an alias and
            type it all out to someone who listens. No real name, no judgement.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                <MessageCircle className="size-4" /> Start venting free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">See who is online</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Why people vent on Anontalk
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {reasons.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="glass h-full rounded-3xl border border-border p-6">
                  <f.icon className="size-5 text-primary" />
                  <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            How to start venting
          </h2>
          <ol className="mt-8 grid gap-4">
            {steps.map((s, i) => (
              <li
                key={s}
                className="flex items-start gap-4 rounded-3xl border border-border bg-card p-5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/auth">Claim your 5 free messages</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Questions about venting online
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-6 text-sm text-muted-foreground">
            Prefer a random chat?{" "}
            <Link to="/talk-to-strangers" className="text-primary underline">
              Talk to strangers anonymously
            </Link>
            .
          </p>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 pb-20">
          <div className="glass rounded-3xl border border-border p-8 text-center">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              Get it off your chest tonight
            </h2>
            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm text-muted-foreground">
              {["Anonymous alias", "5 free messages", "Replies are always free"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> {x}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-7">
              <Link to="/auth">Start venting free</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
