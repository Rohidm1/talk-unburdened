import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import "@/lib/i18n";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { Reveal } from "@/components/site/Reveal";
import { FloatingChat } from "@/components/site/FloatingChat";
import { pageHead, jsonLd, blogSchema } from "@/lib/seo";
import { blogPosts, getPost } from "@/data/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ params, loaderData }) => {
    const title = loaderData
      ? (loaderData.seoTitle ?? `${loaderData.title} | Anontalk`)
      : "Article | Anontalk";
    const description =
      loaderData?.seoDescription ?? loaderData?.excerpt ?? "An article from the Anontalk journal.";
    const url = `https://anontalk.online/blog/${params.slug}`;
    return {
      ...pageHead({ title, description, path: url, type: "article", noindex: !loaderData }),
      scripts: loaderData ? [jsonLd(blogSchema(loaderData))] : [],
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
  // A "## heading" line is its own block even when the paragraph follows on
  // the very next line.
  const blocks = body
    .split("\n\n")
    .flatMap((block) => {
      if (!block.startsWith("## ")) return [block];
      const nl = block.indexOf("\n");
      return nl === -1 ? [block] : [block.slice(0, nl), block.slice(nl + 1)];
    })
    .filter((b) => b.trim().length > 0);
  return (
    <div className="mt-10 space-y-5">
      {blocks.map((block, i) => {
        if (block.trim() === "[[chat]]") {
          return (
            <div
              key={i}
              className="flex flex-col items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-foreground">
                Want to say it to someone right now? Your first 5 messages are free.
              </p>
              <Link
                to="/"
                search={{ chat: 1 }}
                className="glow-cta inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Talk to someone now <ArrowRight className="size-4" />
              </Link>
            </div>
          );
        }
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
      <FloatingChat />
      <main className="mx-auto w-full max-w-3xl px-5 py-16">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All articles
        </Link>

        <article>
        <Reveal>
          <p className="mt-8 text-xs font-semibold tracking-widest text-primary uppercase">
            {post.category}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {post.readMinutes} min read ·{" "}
            {post.updated ? "Updated " : null}
            {new Date(post.updated ?? post.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <Body body={post.body} />
        </Reveal>
        </article>

        <div className="mt-14 rounded-3xl border border-primary/30 bg-primary/5 p-7 text-center">
          <h2 className="font-display text-xl font-semibold">Want to talk it through?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Anonymous, judgment-free chat with a real person. First 5 messages on us.
          </p>
          <Link
            to="/"
            search={{ chat: 1 }}
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
                  <h3 className="font-display font-semibold">{p.title}</h3>
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
