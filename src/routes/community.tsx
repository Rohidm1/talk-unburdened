import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowBigDown, ArrowBigUp, Ban, MessageSquarePlus } from "lucide-react";
import { haptic, isNoCreditError, openPaywall } from "@/lib/native";
import { confirmSafeToSend } from "@/lib/safety";
import { markSeen } from "@/hooks/useBadges";
import { ReportButton } from "@/components/site/ReportDialog";
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
  { id: "loneliness", label: "Loneliness", prompt: "When do you feel most alone — and what helps?" },
  { id: "everyday-stress", label: "Everyday stress", prompt: "What's weighing on you this week?" },
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

type Post = { id: string; parent_id: string | null; user_id: string; alias: string; title: string | null; body: string; score: number; created_at: string };
type Sort = "top" | "new";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function postError(message: string) {
  if (isNoCreditError(message)) {
    openPaywall();
    return;
  }
  toast.error(message.includes("toxic") ? "That breaks our community rules." : message.includes("slow_down") ? "Slow down a little and try again in a minute." : "Could not post.");
}

function SignInPrompt() {
  return (
    <p className="text-sm text-muted-foreground">
      <Link to="/auth" search={{ redirect: "/community" }} className="text-primary underline">Sign in</Link> to join the discussion anonymously.
    </p>
  );
}

function NewTopic({ topic }: { topic: TopicId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return <SignInPrompt />;
  async function submit() {
    const t = title.trim();
    const body = text.trim();
    if (t.length < 5 || body.length < 2) {
      toast.error("Give your topic a title (5+ characters) and a short description.");
      return;
    }
    if (!(await confirmSafeToSend(`${t} ${body}`))) return;
    setBusy(true);
    const { error } = await supabase.from("community_posts").insert({ topic, parent_id: null, user_id: user!.id, title: t, body });
    setBusy(false);
    if (error) return postError(error.message);
    setTitle("");
    setText("");
    haptic(12);
    toast.success("Your topic is live.");
    void qc.invalidateQueries({ queryKey: ["community", topic] });
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Topic title or question" aria-label="Topic title" className="min-h-12 rounded-xl border border-input bg-background/50 px-3 text-sm font-semibold" />
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} rows={3} placeholder="Tell people a bit more…" aria-label="Topic description" className="rounded-xl border border-input bg-background/50 p-3 text-sm" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">1 credit to publish</span>
        <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          <MessageSquarePlus className="size-4" /> Publish topic
        </button>
      </div>
    </form>
  );
}

function ReplyComposer({ topic, parentId, onDone }: { topic: TopicId; parentId: string; onDone?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  if (!user) return <SignInPrompt />;
  async function submit() {
    const body = text.trim();
    if (body.length < 2) return;
    if (!(await confirmSafeToSend(body))) return;
    const { error } = await supabase.from("community_posts").insert({ topic, parent_id: parentId, user_id: user!.id, body });
    if (error) return postError(error.message);
    setText("");
    haptic(10);
    onDone?.();
    void qc.invalidateQueries({ queryKey: ["community", topic] });
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex gap-2">
      <input value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} placeholder="Write a reply… (1 credit)" className="min-h-12 flex-1 rounded-xl border border-input bg-background/50 px-3 text-sm" />
      <button type="submit" className="min-h-12 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Reply</button>
    </form>
  );
}

function Votes({ post, myVote, topic }: { post: Post; myVote: number; topic: TopicId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isMine = user?.id === post.user_id;
  const vote = async (v: 1 | -1) => {
    if (!user) {
      toast.info("Sign in to vote.");
      return;
    }
    const next = myVote === v ? 0 : v;
    haptic(6);
    const { error } = await supabase.rpc("vote_post", { _post_id: post.id, _value: next });
    if (error) {
      toast.error(error.message.includes("own_post") ? "You can't vote on your own post." : "Vote not saved.");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["community", topic] });
    void qc.invalidateQueries({ queryKey: ["community-votes"] });
  };
  return (
    <div className="flex items-center gap-0.5" aria-label="Votes">
      <button type="button" disabled={isMine} onClick={() => void vote(1)} aria-label="Upvote" aria-pressed={myVote === 1} className={`grid size-10 place-items-center rounded-full ${myVote === 1 ? "text-primary" : "text-muted-foreground"} disabled:opacity-40`}>
        <ArrowBigUp className={`size-5 ${myVote === 1 ? "fill-current" : ""}`} />
      </button>
      <span className="min-w-6 text-center text-sm tabular-nums">{post.score}</span>
      <button type="button" disabled={isMine} onClick={() => void vote(-1)} aria-label="Downvote" aria-pressed={myVote === -1} className={`grid size-10 place-items-center rounded-full ${myVote === -1 ? "text-destructive" : "text-muted-foreground"} disabled:opacity-40`}>
        <ArrowBigDown className={`size-5 ${myVote === -1 ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}

function Thread({ post, children, topic, depth, votes, sort }: { post: Post; children: Map<string, Post[]>; topic: TopicId; depth: number; votes: Map<string, number>; sort: Sort }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [replying, setReplying] = useState(false);
  const kids = sortPosts(children.get(post.id) ?? [], sort);
  const isMine = user?.id === post.user_id;
  const block = async () => {
    if (!window.confirm(`Block ${post.alias}? You won't see their posts anymore.`)) return;
    const { error } = await supabase.rpc("block_user_by_post", { _post_id: post.id });
    if (error) return void toast.error("Could not block.");
    toast.success("Blocked.");
    void qc.invalidateQueries({ queryKey: ["my-blocks"] });
  };
  const Heading = depth === 0 ? "h3" : "p";
  return (
    <article className={depth ? "border-l border-border pl-4" : "rounded-2xl border border-border bg-card p-4"}>
      <p className="text-xs text-muted-foreground">{post.alias} · {timeAgo(post.created_at)}</p>
      {post.title ? <Heading className="mt-1 font-display text-lg font-semibold">{post.title}</Heading> : null}
      <p className="mt-1 whitespace-pre-wrap text-sm">{post.body}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3">
        <Votes post={post} myVote={votes.get(post.id) ?? 0} topic={topic} />
        {depth < 3 ? (
          <button type="button" onClick={() => setReplying((r) => !r)} className="min-h-10 text-xs font-medium text-primary">Reply</button>
        ) : null}
        {user && !isMine ? (
          <>
            <ReportButton target={{ type: "community_post", id: post.id, onDone: () => void qc.invalidateQueries({ queryKey: ["my-blocks"] }) }} />
            <button type="button" onClick={() => void block()} className="inline-flex min-h-10 items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Ban className="size-3.5" /> Block</button>
          </>
        ) : null}
      </div>
      {replying ? <div className="mt-2"><ReplyComposer topic={topic} parentId={post.id} onDone={() => setReplying(false)} /></div> : null}
      {kids.length ? <div className="mt-3 space-y-3">{kids.map((k) => <Thread key={k.id} post={k} children={children} topic={topic} depth={depth + 1} votes={votes} sort={sort} />)}</div> : null}
    </article>
  );
}

function sortPosts(list: Post[], sort: Sort) {
  return [...list].sort((a, b) => (sort === "top" ? b.score - a.score : 0) || +new Date(b.created_at) - +new Date(a.created_at));
}

function CommunityPage() {
  const { topic = "loneliness" } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const current = TOPICS.find((t) => t.id === topic)!;
  const [sort, setSort] = useState<Sort>("top");

  useEffect(() => {
    markSeen("community");
  }, []);

  const posts = useQuery({
    queryKey: ["community", topic],
    queryFn: async () => {
      const { data } = await supabase.from("community_posts").select("id,parent_id,user_id,alias,title,body,score,created_at").eq("topic", topic).order("created_at", { ascending: false }).limit(300);
      return (data ?? []) as Post[];
    },
  });

  const myVotes = useQuery({
    queryKey: ["community-votes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("community_votes").select("post_id,value");
      return new Map((data ?? []).map((v) => [v.post_id, v.value]));
    },
  });

  const blocks = useQuery({
    queryKey: ["my-blocks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_blocks").select("blocked_id");
      return new Set((data ?? []).map((b) => b.blocked_id));
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
    const blocked = blocks.data ?? new Set<string>();
    const children = new Map<string, Post[]>();
    const roots: Post[] = [];
    for (const p of posts.data ?? []) {
      if (blocked.has(p.user_id)) continue;
      if (!p.parent_id) roots.push(p);
      else children.set(p.parent_id, [...(children.get(p.parent_id) ?? []), p]);
    }
    return { roots: sortPosts(roots, sort), children };
  }, [posts.data, blocks.data, sort]);

  const votes = myVotes.data ?? new Map<string, number>();

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <FloatingChat />
      <main className="mx-auto max-w-4xl px-5 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Community</h1>
        <p className="mt-3 text-muted-foreground">Start a topic, reply with kindness, and vote up what helps. Anonymous, always.</p>
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Categories">
          {TOPICS.map((t) => (
            <Link key={t.id} to="/community" search={{ topic: t.id }} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${t.id === topic ? "border-primary bg-primary/15 text-primary" : "border-border"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <section className="glass mt-6 rounded-3xl p-6" aria-labelledby="new-topic">
          <h2 id="new-topic" className="font-display text-xl font-semibold">Start a topic in {current.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Need inspiration? {current.prompt}</p>
          <div className="mt-4"><NewTopic topic={topic} /></div>
        </section>
        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Topics</h2>
          <div role="tablist" aria-label="Sort" className="flex rounded-full border border-border p-1 text-sm">
            {(["top", "new"] as const).map((s) => (
              <button key={s} role="tab" type="button" aria-selected={sort === s} onClick={() => setSort(s)} className={`min-h-9 rounded-full px-4 ${sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {s === "top" ? "Most helpful" : "Newest"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {posts.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!posts.isLoading && roots.length === 0 ? <p className="text-sm text-muted-foreground">No topics yet — start the conversation.</p> : null}
          {roots.map((p) => <Thread key={p.id} post={p} children={children} topic={topic} depth={0} votes={votes} sort={sort} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}
