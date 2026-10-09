import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { FloatingChat } from "@/components/site/FloatingChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const title = "Anontalk Community – Anonymous Discussions & Confessions";
const description =
  "Anonymous discussions on relationships, ethics, unpopular opinions and confessions. Post, reply and see new comments live.";

const TOPICS = [
  { id: "relationships", label: "Relationships", prompt: "What's one thing you wish your partner understood?" },
  { id: "ethics", label: "Ethics", prompt: "Is it okay to lie to protect someone you love?" },
  { id: "unpopular-opinions", label: "Unpopular opinions", prompt: "Share an opinion most people disagree with." },
  { id: "confessions", label: "Confessions", prompt: "What's something you've never told anyone?" },
] as const;
type TopicId = (typeof TOPICS)[number]["id"];

export const Route = createFileRoute("/community")({
  validateSearch: (s: Record<string, unknown>): { topic?: TopicId } =>
    TOPICS.some((t) => t.id === s["topic"]) ? { topic: s["topic"] as TopicId } : {},
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://anontalk.online/community" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://anontalk.online/community" }],
  }),
  component: CommunityPage,
});

type Post = { id: string; parent_id: string | null; alias: string; body: string; created_at: string };

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function Composer({ topic, parentId, onDone, placeholder }: { topic: TopicId; parentId: string | null; onDone?: () => void; placeholder: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link to="/auth" search={{ redirect: "/community" }} className="text-primary underline">Sign in</Link> to join the discussion anonymously.
      </p>
    );
  }
  async function submit() {
    const body = text.trim();
    if (body.length < 2) return;
    const { error } = await supabase.from("community_posts").insert({ topic, parent_id: parentId, user_id: user!.id, body });
    if (error) {
      toast.error(error.message.includes("toxic") ? "That breaks our community rules." : error.message.includes("slow_down") ? "Slow down a little and try again in a minute." : "Could not post.");
      return;
    }
    setText("");
    onDone?.();
    void qc.invalidateQueries({ queryKey: ["community", topic] });
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex gap-2">
      <input value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} placeholder={placeholder} className="flex-1 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm" />
      <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Post</button>
    </form>
  );
}

function Thread({ post, children, topic, depth }: { post: Post; children: Map<string, Post[]>; topic: TopicId; depth: number }) {
  const [replying, setReplying] = useState(false);
  const kids = children.get(post.id) ?? [];
  return (
    <div className={depth ? "border-l border-border pl-4" : "rounded-2xl border border-border bg-card p-4"}>
      <p className="text-xs text-muted-foreground">{post.alias} · {timeAgo(post.created_at)}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{post.body}</p>
      {depth < 3 ? (
        <button type="button" onClick={() => setReplying((r) => !r)} className="mt-1 text-xs text-primary">Reply</button>
      ) : null}
      {replying ? <div className="mt-2"><Composer topic={topic} parentId={post.id} placeholder="Write a reply…" onDone={() => setReplying(false)} /></div> : null}
      {kids.length ? <div className="mt-3 space-y-3">{kids.map((k) => <Thread key={k.id} post={k} children={children} topic={topic} depth={depth + 1} />)}</div> : null}
    </div>
  );
}

function CommunityPage() {
  const { topic = "relationships" } = Route.useSearch();
  const qc = useQueryClient();
  const current = TOPICS.find((t) => t.id === topic)!;

  const posts = useQuery({
    queryKey: ["community", topic],
    queryFn: async () => {
      const { data } = await supabase.from("community_posts").select("id,parent_id,alias,body,created_at").eq("topic", topic).order("created_at", { ascending: false }).limit(300);
      return (data ?? []) as Post[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`community-${topic}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts", filter: `topic=eq.${topic}` }, () =>
        void qc.invalidateQueries({ queryKey: ["community", topic] }),
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [topic, qc]);

  const { roots, children } = useMemo(() => {
    const children = new Map<string, Post[]>();
    const roots: Post[] = [];
    for (const p of posts.data ?? []) {
      if (!p.parent_id) roots.push(p);
      else children.set(p.parent_id, [p, ...(children.get(p.parent_id) ?? [])]);
    }
    return { roots, children };
  }, [posts.data]);

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <FloatingChat />
      <main className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Community</h1>
        <p className="mt-3 text-muted-foreground">Anonymous discussions. Be honest, be kind.</p>
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Topics">
          {TOPICS.map((t) => (
            <Link key={t.id} to="/community" search={{ topic: t.id }} className={`rounded-full border px-4 py-1.5 text-sm ${t.id === topic ? "border-primary bg-primary/15 text-primary" : "border-border"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <section className="glass mt-6 rounded-3xl p-6">
          <h2 className="font-display text-xl font-semibold">{current.prompt}</h2>
          <div className="mt-4"><Composer topic={topic} parentId={null} placeholder="Share your take…" /></div>
        </section>
        <div className="mt-6 space-y-4">
          {posts.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!posts.isLoading && roots.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet — start the conversation.</p> : null}
          {roots.map((p) => <Thread key={p.id} post={p} children={children} topic={topic} depth={0} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}
