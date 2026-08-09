import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import "@/lib/i18n";
import {
  AlertTriangle,
  Ban,
  Check,
  Crown,
  Flag,
  Hand,
  Info,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Search,
  ShieldCheck,
  Smile,
  Sparkle,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { handbook, type Block, type Section } from "@/data/handbook";
import { cn } from "@/lib/utils";

const title = "Agent Handbook & Knowledge Base | Anontalk";
const description =
  "The complete operational guide for Anontalk chat support agents: role, anonymity, message quality, payouts, forbidden terms, crisis protocol and a full dashboard walkthrough.";

export const Route = createFileRoute("/handbook")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HandbookPage,
});

const icons: Record<string, LucideIcon> = {
  Hand,
  ShieldCheck,
  Crown,
  Wallet,
  Ban,
  LifeBuoy,
  LayoutDashboard,
};

function blockText(b: Block): string {
  switch (b.kind) {
    case "text":
      return b.text;
    case "list":
      return b.items.join(" ");
    case "callout":
      return [b.title, b.body, ...(b.items ?? [])].join(" ");
    case "quote":
      return b.text;
    case "chips":
      return [b.label, ...b.items].join(" ");
    case "steps":
      return b.items.map((s) => `${s.title} ${s.body}`).join(" ");
    case "mock":
      return b.caption;
  }
}

function matches(section: Section, q: string) {
  if (!q) return section;
  const needle = q.toLowerCase();
  const subs = section.subsections.filter((sub) =>
    [sub.title, ...sub.blocks.map(blockText)].join(" ").toLowerCase().includes(needle),
  );
  if (subs.length) return { ...section, subsections: subs };
  if (`${section.title} ${section.summary}`.toLowerCase().includes(needle)) return section;
  return null;
}

function HandbookPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(handbook[0].id);

  const results = useMemo(
    () => handbook.map((s) => matches(s, query.trim())).filter(Boolean) as Section[],
    [query],
  );

  const scrollTo = (id: string) => {
    setActive(id);
    const el = document.getElementById(`section-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-5 py-12">
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
            <Sparkle className="h-3.5 w-3.5" /> Internal — for chat agents only
          </span>
          <h1 className="mt-5 font-display text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            Chat Support Agent Handbook &amp; Operational Guide
          </h1>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Everything you need to work independently from day one: how to write, what you may never say,
            how you get paid, and exactly what to do in a crisis.
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the handbook…"
                aria-label="Search the handbook"
                className="pl-9"
              />
            </div>
            <nav className="mt-4 space-y-1">
              {handbook.map((s) => {
                const Icon = icons[s.icon] ?? Info;
                const visible = results.some((r) => r.id === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => scrollTo(s.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm transition",
                      active === s.id
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      !visible && "opacity-40",
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <span className="text-muted-foreground mr-1.5 text-xs">{s.number}.</span>
                      {s.title}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6">
            {query && (
              <p className="text-muted-foreground text-sm">
                {results.length
                  ? `Showing ${results.length} matching section${results.length === 1 ? "" : "s"} for “${query}”.`
                  : `No results for “${query}”.`}
              </p>
            )}

            {results.map((section) => {
              const Icon = icons[section.icon] ?? Info;
              return (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className="border-border/70 bg-card/70 rounded-3xl border p-5 shadow-[var(--shadow-card)] md:p-7"
                >
                  <div className="flex items-start gap-4">
                    <span className="bg-primary/12 border-primary/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border">
                      <Icon className="text-primary h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">
                        <span className="text-primary mr-2">{section.number}.</span>
                        {section.title}
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">{section.summary}</p>
                    </div>
                  </div>

                  <Accordion
                    type="multiple"
                    defaultValue={section.subsections.map((s) => s.id)}
                    className="mt-4"
                  >
                    {section.subsections.map((sub) => (
                      <AccordionItem key={sub.id} value={sub.id} className="border-border/60">
                        <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                          {sub.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pb-2">
                            {sub.blocks.map((b, i) => (
                              <BlockView key={i} block={b} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const toneStyles = {
  danger: "border-destructive/50 bg-destructive/10 text-foreground",
  warning: "border-warning/50 bg-warning/10 text-foreground",
  info: "border-primary/40 bg-primary/10 text-foreground",
  success: "border-success/45 bg-success/10 text-foreground",
} as const;

const toneIcon = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: Check,
} as const;

function BlockView({ block }: { block: Block }) {
  if (block.kind === "text") {
    return <p className="text-muted-foreground text-sm leading-relaxed">{block.text}</p>;
  }

  if (block.kind === "list") {
    const List = block.ordered ? "ol" : "ul";
    return (
      <List
        className={cn(
          "text-muted-foreground space-y-2 pl-5 text-sm leading-relaxed",
          block.ordered ? "list-decimal" : "list-disc",
        )}
      >
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </List>
    );
  }

  if (block.kind === "callout") {
    const Icon = toneIcon[block.tone];
    return (
      <div className={cn("rounded-2xl border p-4", toneStyles[block.tone])}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4" />
          {block.title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed opacity-90">{block.body}</p>
        {block.items && (
          <div className="mt-3 flex flex-wrap gap-2">
            {block.items.map((it) => (
              <span key={it} className="border-border/70 bg-background/50 rounded-lg border px-2 py-1 font-mono text-xs">
                {it}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.kind === "quote") {
    return (
      <blockquote className="border-primary/70 bg-secondary/40 rounded-r-2xl border-l-4 p-4 text-sm leading-relaxed italic">
        “{block.text}”
      </blockquote>
    );
  }

  if (block.kind === "chips") {
    const danger = block.tone === "danger";
    return (
      <div className={cn("rounded-2xl border p-4", danger ? toneStyles.danger : "border-border/70 bg-secondary/30")}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          {danger ? <Ban className="h-4 w-4" /> : <Info className="text-primary h-4 w-4" />}
          {block.label}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {block.items.map((it) => (
            <span
              key={it}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium",
                danger
                  ? "border-destructive/50 bg-destructive/15 text-foreground line-through"
                  : "border-border/70 bg-background/60",
              )}
            >
              {it}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (block.kind === "steps") {
    return (
      <ol className="space-y-3">
        {block.items.map((s, i) => (
          <li key={s.title} className="border-border/60 bg-secondary/25 flex gap-3 rounded-2xl border p-4">
            <span className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="text-muted-foreground mt-1 block text-sm leading-relaxed">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return <Mock block={block} />;
}

function Mock({ block }: { block: Extract<Block, { kind: "mock" }> }) {
  return (
    <figure className="border-border/70 bg-background/60 overflow-hidden rounded-2xl border">
      <div className="border-border/60 bg-secondary/40 flex items-center gap-1.5 border-b px-3 py-2">
        <span className="bg-destructive/70 h-2.5 w-2.5 rounded-full" />
        <span className="bg-warning/70 h-2.5 w-2.5 rounded-full" />
        <span className="bg-success/70 h-2.5 w-2.5 rounded-full" />
        <span className="text-muted-foreground ml-2 text-[11px]">Agent dashboard — preview</span>
      </div>
      <div className="p-4">{renderMock(block.variant)}</div>
      <figcaption className="border-border/60 text-muted-foreground border-t px-4 py-2 text-xs">
        {block.caption}
      </figcaption>
    </figure>
  );
}

function renderMock(variant: Extract<Block, { kind: "mock" }>["variant"]) {
  if (variant === "queue") {
    return (
      <div className="space-y-2">
        {[
          { name: "Guest 4821", wait: "waiting 0:12" },
          { name: "Guest 1190", wait: "waiting 0:44" },
        ].map((r) => (
          <div key={r.name} className="border-border/60 bg-card/60 flex items-center justify-between rounded-xl border px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm">
              <MessageSquare className="text-primary h-4 w-4" />
              {r.name}
              <span className="text-muted-foreground text-xs">{r.wait}</span>
            </span>
            <span className="bg-primary text-primary-foreground rounded-lg px-2.5 py-1 text-xs font-semibold">Claim chat</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-border/60 bg-card/60 rounded-xl border p-3">
          <p className="text-sm font-semibold">Persona: “Amara, 27”</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Warm, curious, works in a bookshop. Loves late-night talks and bad reality TV.
          </p>
        </div>
        <div className="border-border/60 bg-card/60 rounded-xl border p-3">
          <p className="text-sm font-semibold">Saved notes</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-4 text-xs">
            <li>Calls himself Danny · Texas</li>
            <li>Night shifts, sleeps badly</li>
            <li>Talked about his dog last time</li>
          </ul>
        </div>
      </div>
    );
  }

  if (variant === "editor") {
    return (
      <div className="border-border/60 bg-card/60 rounded-xl border p-3">
        <p className="text-sm leading-relaxed">
          That sounds like a long week, Danny. What kept you going through those night shifts?
        </p>
        <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
          <span className="flex items-center gap-3">
            <Smile className="h-4 w-4" /> Emoji
            <span className="border-border/60 rounded border px-1.5 py-0.5">Quick notes</span>
          </span>
          <span>86 / 500</span>
        </div>
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Messages this shift", value: "128" },
          { label: "Approved", value: "126" },
          { label: "Est. earnings", value: "$54.20" },
        ].map((s) => (
          <div key={s.label} className="border-border/60 bg-card/60 rounded-xl border p-3">
            <p className="font-display text-primary text-xl font-semibold">{s.value}</p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-destructive/50 bg-destructive/10 flex items-center justify-between rounded-xl border px-3 py-2.5">
      <span className="text-sm">Policy violation, abuse or crisis situation?</span>
      <span className="bg-destructive text-destructive-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
        <Flag className="h-3.5 w-3.5" /> Report / Flag chat
      </span>
    </div>
  );
}
