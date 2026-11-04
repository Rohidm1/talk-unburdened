import type { ReactNode } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";

type LegalSection = { id: string; title: string; content: ReactNode };

/** Shared layout for legal and compliance pages: answer capsule, table of contents, sections. */
export function LegalPage({ title, summary, sections }: { title: string; summary: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-dvh bg-background font-body text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: 4 November 2026</p>

        <aside role="note" aria-labelledby="in-short" className="mt-8 rounded-2xl border border-primary/30 bg-primary/10 p-6">
          <h2 id="in-short" className="text-lg font-semibold">In short</h2>
          <p className="mt-2 leading-7">{summary}</p>
        </aside>

        <nav aria-label="On this page" className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">On this page</h2>
          <ul className="mt-3 space-y-1">
            {sections.map(({ id, title: t }) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-10 items-center text-primary underline underline-offset-4">{t}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map(({ id, title: t, content }) => (
            <section key={id} aria-labelledby={id} className="scroll-mt-24">
              <h2 id={id} className="font-display text-2xl font-semibold">{t}</h2>
              <div className="mt-3 space-y-4 leading-7 text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                {content}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
