import { createFileRoute, Link } from "@tanstack/react-router";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { Reveal } from "@/components/site/Reveal";
import { FloatingChat } from "@/components/site/FloatingChat";
import { blogPosts } from "@/data/blog";
import { ArrowRight, Clock } from "lucide-react";

const title = "Anontalk Blog – Loneliness, Stress & Talking It Through";
const description =
  "Short, practical articles on loneliness, stress, self-reflection and why talking things through anonymously helps.";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://anontalk.online/blog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://anontalk.online/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <FloatingChat />
      <main className="mx-auto w-full max-w-6xl px-5 py-16">
        <Reveal>
          <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
            The Anontalk journal
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            Honest reading on the things people rarely say out loud
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            No jargon, no lectures. Short pieces on everyday worries, loneliness and personal growth —
            written to be useful in the ten minutes you actually have.
          </p>
        </Reveal>

        {featured ? (
          <Reveal delay={0.05}>
            <Link
              to="/blog/$slug"
              params={{ slug: featured.slug }}
              className="card-lift mt-12 grid gap-6 rounded-3xl border border-border bg-card p-8 md:grid-cols-[1.4fr_1fr] md:items-center"
            >
              <div>
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                  {featured.category}
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{featured.excerpt}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Read the article <ArrowRight className="size-4" />
                </span>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" /> {featured.readMinutes} min read
                </p>
                <p className="mt-2">
                  {new Date(featured.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          </Reveal>
        ) : null}

        <section aria-labelledby="more-blog-posts" className="mt-8">
        <h2 id="more-blog-posts" className="font-display text-2xl font-semibold">More articles</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, i) => (
            <Reveal key={post.slug} delay={0.04 * i}>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="card-lift flex h-full flex-col rounded-3xl border border-border bg-card p-6"
              >
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                  {post.category}
                </p>
                <h3 className="mt-3 font-display text-lg font-semibold">{post.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> {post.readMinutes} min read
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
        </section>

        <Reveal>
          <div className="mt-16 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
            <h2 className="font-display text-2xl font-semibold">
              Reading about it helps. Saying it out loud helps more.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Your first 5 messages are free, and nobody ever learns your name.
            </p>
            <Link
              to="/"
              hash="listeners"
              className="glow-cta mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Start an anonymous chat <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
