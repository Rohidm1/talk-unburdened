import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import "@/lib/i18n";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { Reveal } from "@/components/site/Reveal";
import { blogPosts, getPost } from "@/data/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} | Anontalk` : "Article | Anontalk";
    const description = loaderData?.excerpt ?? "An article from the Anontalk journal.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <Fallback message="This article could not be loaded." />,
  notFoundComponent: () => <Fallback message="This article does not exist." />,
  component: BlogPostPage,
});

function Fallback({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <p className="text-muted-foreground">{message}</p>
        <Link to="/blog" className="mt-4 inline-flex text-sm font-medium text-primary">
          Back to the blog
        </Link>
      </main>
      <Footer />
    </div>
  );
}

function Body({ body }: { body: string }) {
  const blocks = body.split("\n\n");
  return (
    <div className="mt-10 space-y-5">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-4 font-display text-xl font-semibold md:text-2xl">
              {block.slice(3)}
            </h2>
          );
        }
        if (block.startsWith("- ")) {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {block.split("\n").map((line, j) => (
                <li key={j} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{line.replace(/^- /, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function BlogPostPage() {
  const post = Route.useLoaderData();
  const more = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-16">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All articles
        </Link>

        <Reveal>
          <p className="mt-8 text-xs font-semibold tracking-widest text-primary uppercase">
            {post.category}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {post.readMinutes} min read ·{" "}
            {new Date(post.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <Body body={post.body} />
        </Reveal>

        <div className="mt-14 rounded-3xl border border-primary/30 bg-primary/5 p-7 text-center">
          <h2 className="font-display text-xl font-semibold">Want to talk it through?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Anonymous, judgment-free chat with a real person. First three messages on us.
          </p>
          <Link
            to="/"
            hash="listeners"
            className="glow-cta mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Start chatting <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-14">
          <h2 className="font-display text-lg font-semibold">Keep reading</h2>
          <ul className="mt-4 grid gap-3">
            {more.map((p) => (
              <li key={p.slug}>
                <Link
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="card-lift block rounded-2xl border border-border bg-card p-5"
                >
                  <p className="font-display font-semibold">{p.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
