import { Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { directAnswer, homeAnswers } from "@/data/home-answers";

export function DirectAnswer() {
  return (
    <section aria-labelledby="about-anontalk" className="border-y border-border bg-secondary/20">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <h2 id="about-anontalk" className="font-display text-2xl font-semibold md:text-3xl">What is Anontalk?</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{directAnswer}</p>
        <nav aria-label="Explore Anontalk" className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-primary">
          <Link to="/bottles" className="underline underline-offset-4">Message bottles</Link>
          <Link to="/dilemma" className="underline underline-offset-4">Dilemmas</Link>
          <Link to="/blog" className="underline underline-offset-4">Blogs</Link>
        </nav>
      </div>
    </section>
  );
}

export function HomeFaq() {
  return (
    <section id="faq" aria-labelledby="home-faq-title" className="mx-auto w-full max-w-3xl px-5 py-16">
      <h2 id="home-faq-title" className="font-display text-2xl font-semibold md:text-3xl">Frequently asked questions about Anontalk</h2>
      <Accordion type="single" collapsible className="mt-6 [&_[role=region][data-state=closed]]:hidden">
        {homeAnswers.map(({ question, answer }, index) => (
          <AccordionItem key={question} value={`answer-${index}`}>
            <AccordionTrigger className="font-display text-base">{question}</AccordionTrigger>
            <AccordionContent forceMount className="text-sm leading-relaxed text-muted-foreground data-[state=closed]:hidden">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}