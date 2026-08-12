import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  EyeOff,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { ParticleField } from "@/components/site/ParticleField";
import { Reveal } from "@/components/site/Reveal";

const title = "Talk to Strangers Online — Anonymous Chat (Omegle Alternative)";
const description =
  "Chat with strangers anonymously, text only. Pick an alias, get 5 free messages, then 1 credit per message. No video, no real names, no waiting room.";
const url = "https://anontalk.online/talk-to-strangers";

const faqs = [
  {
    q: "Is this a good Omegle alternative?",
    a: "It is text-only and anonymous, but calmer. There is no random video, no cam roulette and no strangers watching you. You pick an alias and start typing with a real person who reads every word.",
  },
  {
    q: "Do I have to give my real name?",
    a: "No. You choose an alias, and that alias is the only thing your chat partner ever sees. We never ask for your real name, address or phone number.",
  },
  {
    q: "Is it free to talk to strangers here?",
    a: "You get 5 free messages when you sign up. After that each message you send costs 1 credit, and replies you receive are always free.",
  },
  {
    q: "Can I talk about anything?",
    a: "Yes, as long as it is respectful. People use it to vent, to think out loud, or simply because they do not want to be alone with their thoughts tonight.",
  },
];

export const Route = createFileRoute("/talk-to-strangers")({
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
  component: TalkToStrangersPage,
});

const facts = [
  {
    icon: EyeOff,
    title: "An alias, never your name",
    body: "You pick a nickname. That is all anyone sees — no profile photo, no phone number, no email shown to your chat partner.",
  },
  {
    icon: Sparkles,
    title: "5 free messages to start",
    body: "Sign up and you can send 5 messages straight away. No card needed to see whether it feels right.",
  },
  {
    icon: Zap,
    title: "1 credit per message",
    body: "After the free ones, each message you send costs 1 credit. Every reply you get back is free. No subscription, no monthly fee.",
  },
  {
    icon: ShieldCheck,
    title: "Text only, on purpose",
    body: "No video, no cam roulette, no microphone. Just words, which is what makes honest conversations easier.",
  },
];

const steps = [
  "Create an account with an alias — it takes about twenty seconds.",
  "Pick someone who is online right now from the chat partners on the home page.",
  "Start typing. Your first 5 messages are on us.",
];

function TalkToStrangersPage() {
  return (
    <div className="relative min-h-screen">
      <ParticleField />
      <Header />

      <main>
        <section className="mx-auto w-full max-w-4xl px-5 pt-16 pb-12 text-center md:pt-24">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Anonymous chat · Omegle alternative
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Talk to strangers, without becoming one to yourself
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Anontalk is anonymous, text-only chat with real people. Choose an alias, get 5 free
            messages, and say the thing you have been carrying around all week.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                <MessageCircle className="size-4" /> Start chatting free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">See who is online</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            What you actually get
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {facts.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
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
            How to start a conversation
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
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Claim your 5 free messages</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 py-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Questions people ask first
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 pb-20">
          <div className="glass rounded-3xl border border-border p-8 text-center">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              Someone is online right now
            </h2>
            <p className="mt-3 text-muted-foreground">
              No waiting room, no forms, no explaining yourself twice.
            </p>
            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm text-muted-foreground">
              {["Anonymous alias", "5 free messages", "1 credit per message you send"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> {x}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-7">
              <Link to="/auth">Start chatting free</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
