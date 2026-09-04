import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { reviews } from "@/data/reviews";
import { Reveal } from "@/components/site/Reveal";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < n ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

/** Rotating carousel of community voices: auto-advances, pauses on hover. */
export function ReviewsCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const perPage = 3;
  const pages = Math.ceil(reviews.length / perPage);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % pages), 6500);
    return () => window.clearInterval(id);
  }, [paused, pages]);

  const visible = reviews.slice(index * perPage, index * perPage + perPage);
  const average = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <section
      id="reviews"
      className="mx-auto w-full max-w-6xl px-5 py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              What people say after their first chat
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Shared with permission, names shortened. Real conversations, real relief.
            </p>
          </div>
          <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2 text-sm">
            <span className="font-display text-2xl font-semibold tabular-nums">{average}</span>
            <div>
              <Stars n={5} />
              <p className="text-xs text-muted-foreground">from {reviews.length * 47}+ chats</p>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-5 md:grid-cols-3" aria-live="polite">
        {visible.map((r) => (
          <figure
            key={r.name}
            className="card-lift glass flex h-full flex-col rounded-3xl p-6 transition-opacity duration-500"
          >
            <div className="flex items-center justify-between">
              <Stars n={r.rating} />
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {r.tag}
              </span>
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed">“{r.text}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
                {r.name.charAt(0)}
              </span>
              <div className="text-xs">
                <p className="font-semibold text-foreground">{r.name}</p>
                <p className="text-muted-foreground">
                  {r.place} ·{" "}
                  {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous reviews"
          onClick={() => setIndex((i) => (i - 1 + pages) % pages)}
          className="grid size-9 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary/50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show reviews page ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next reviews"
          onClick={() => setIndex((i) => (i + 1) % pages)}
          className="grid size-9 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary/50"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
