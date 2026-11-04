import { createFileRoute } from "@tanstack/react-router";
import { Phone, MessageSquare, LifeBuoy } from "lucide-react";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { HELPLINES, EMERGENCY_NOTE } from "@/data/helplines";
import { breadcrumbSchema, jsonLd, pageHead } from "@/lib/seo";
import { openSos } from "@/lib/safety";

export const Route = createFileRoute("/help")({
  head: () => ({
    ...pageHead({
      title: "Crisis Helplines – Get Help Now | Anontalk",
      description: "Free, confidential crisis helplines in the Netherlands (113), Belgium (1813), Greece (1018), the US (988) and Germany (TelefonSeelsorge).",
      path: "/help",
    }),
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Get help now", path: "/help" }]))],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="min-h-dvh bg-background font-body text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Get help now</h1>
        <aside role="note" className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-5">
          <h2 className="font-semibold">In short</h2>
          <p className="mt-1 leading-7">
            If you're thinking about ending your life or worried about someone, these free helplines are there for you, day and night.
            Anontalk is peer conversation and cannot help in an emergency. {EMERGENCY_NOTE}
          </p>
        </aside>

        <ul className="mt-8 space-y-4">
          {HELPLINES.map((h) => (
            <li key={h.country} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-xl font-semibold"><span aria-hidden>{h.flag}</span> {h.country}</h2>
              <p className="mt-1 font-medium">{h.name}</p>
              <p className="text-sm text-muted-foreground">{h.contact}{h.note ? ` · ${h.note}` : ""}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`tel:${h.tel}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                  <Phone className="size-4" aria-hidden /> Call {h.display ?? h.tel}
                </a>
                {h.sms ? (
                  <a href={`sms:${h.sms}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-5 text-sm">
                    <MessageSquare className="size-4" aria-hidden /> Text {h.sms}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-semibold">Feeling overwhelmed right now?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Take one guided minute to slow your breathing. It won't fix everything, but it can make the next step easier.</p>
          <button type="button" onClick={openSos} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-5 text-sm font-semibold text-primary">
            <LifeBuoy className="size-4" aria-hidden /> Start Mood SOS
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
