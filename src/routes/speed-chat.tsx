import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { alertUser, haptic, isNoCreditError, openPaywall } from "@/lib/native";
import { Flag, Send, Users } from "lucide-react";
import { confirmSafeToSend } from "@/lib/safety";
import { openReport } from "@/components/site/ReportDialog";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const title = "Speed-Chat – 2-Minute Anonymous Chats With Strangers | Anontalk";
const description =
  "Get matched with a random stranger for a 2-minute anonymous chat. Both want more time? Extend it. No names, no contact details.";

export const Route = createFileRoute("/speed-chat")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://anontalk.online/speed-chat" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://anontalk.online/speed-chat" }],
  }),
  component: SpeedChatPage,
});

type Match = {
  id: string;
  user_a: string;
  user_b: string;
  ends_at: string;
  a_extend: boolean;
  b_extend: boolean;
  status: string;
};
type Msg = { id: string; user_id: string; body: string };

const ERRORS: Record<string, string> = {
  daily_limit: "You've had 3 speed-chats today. Come back tomorrow!",
  blocked: "Your account is on hold.",
  toxic: "That message breaks our rules and wasn't sent.",
  closed: "This chat has ended.",
};
const errText = (m: string) => ERRORS[Object.keys(ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Something went wrong.";

/** Contact details are replaced by "[hidden]" on the server; show them as a blurred block. */
function MaskedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[hidden\])/g).map((part, i) =>
        part === "[hidden]" ? (
          <span key={i} title="Personal info hidden for your safety" className="mx-0.5 inline-block select-none rounded bg-current/20 px-1 blur-[3px]" aria-label="hidden personal information">
            ●●●●●●
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SpeedChatPage() {
  const { user, loading } = useAuth();
  const [state, setState] = useState<"idle" | "searching" | "chat" | "ended">("idle");
  const [match, setMatch] = useState<Match | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [now, setNow] = useState(Date.now());
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotateIn, setRotateIn] = useState<number | null>(null);
  const [buddyState, setBuddyState] = useState<"none" | "pending" | "active">("none");
  const [reported, setReported] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Searching: retry joining every 3s until matched.
  useEffect(() => {
    if (state !== "searching") return;
    let stop = false;
    const tryJoin = async () => {
      const { data, error } = await supabase.rpc("speed_join");
      if (stop) return;
      if (error) {
        toast.error(errText(error.message));
        setState("idle");
        return;
      }
      if (data) await openMatch(data as string);
    };
    void tryJoin();
    const t = window.setInterval(tryJoin, 3000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function openMatch(id: string) {
    const { data } = await supabase.from("speed_matches").select("*").eq("id", id).single();
    const { data: m } = await supabase.from("speed_messages").select("id,user_id,body").eq("match_id", id).order("created_at");
    if (!data) return;
    setMatch(data);
    setMsgs(m ?? []);
    setState("chat");
    alertUser({ title: "You're matched!", body: "Say hi — your 2 minutes have started.", url: "/speed-chat", sound: "match", tag: "speed" });
  }

  // Realtime updates for the active match.
  useEffect(() => {
    if (!match) return;
    const ch = supabase
      .channel(`speed-${match.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "speed_messages", filter: `match_id=eq.${match.id}` }, (p) =>
        setMsgs((list) => (list.some((x) => x.id === (p.new as Msg).id) ? list : [...list, p.new as Msg])),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "speed_matches", filter: `id=eq.${match.id}` }, (p) =>
        setMatch(p.new as Match),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [match?.id]);

  useEffect(() => {
    if (state !== "chat") return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [state]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  const left = match ? Math.max(0, Math.ceil((new Date(match.ends_at).getTime() - now) / 1000)) : 0;
  useEffect(() => {
    if (state === "chat" && match && (left === 0 || match.status !== "active")) setState("ended");
  }, [left, match, state]);

  // Automatic rotation: a few seconds after a chat ends, look for the next stranger.
  useEffect(() => {
    if (state !== "ended" || !autoRotate || reported || buddyState !== "none") {
      setRotateIn(null);
      return;
    }
    setRotateIn(8);
    const id = window.setInterval(() => {
      setRotateIn((v) => {
        if (v === null) return null;
        if (v <= 1) {
          window.clearInterval(id);
          setMatch(null);
          setMsgs([]);
          setState("searching");
          return null;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state, autoRotate, reported, buddyState]);

  useEffect(() => {
    return () => {
      void supabase.rpc("speed_leave_queue");
    };
  }, []);

  const iAmA = match?.user_a === user?.id;
  const iExtended = match ? (iAmA ? match.a_extend : match.b_extend) : false;
  const theyExtended = match ? (iAmA ? match.b_extend : match.a_extend) : false;

  async function send() {
    const body = text.trim();
    if (!body || !match) return;
    if (!(await confirmSafeToSend(body))) return;
    setText("");
    const { error } = await supabase.rpc("speed_send", { _match_id: match.id, _body: body });
    if (error) {
      if (isNoCreditError(error.message)) {
        setText(body);
        openPaywall();
        return;
      }
      toast.error(errText(error.message));
      return;
    }
    haptic(8);
  }

  function report() {
    if (!match) return;
    openReport({
      type: "speed_chat",
      id: match.id,
      onDone: () => {
        setReported(true);
        setState("ended");
      },
    });
  }

  async function becomeBuddies() {
    if (!match) return;
    const { data, error } = await supabase.rpc("buddy_request", { _match_id: match.id });
    if (error) {
      toast.error(error.message.includes("buddy_limit") ? "You already have 10 buddies." : "Could not send the buddy request.");
      return;
    }
    haptic(20);
    setBuddyState(data === "active" ? "active" : "pending");
    toast.success(data === "active" ? "You're anonymous buddies now 🤝" : "Buddy request sent. If they tap it too, you're connected.");
  }

  function startSearch() {
    setMatch(null);
    setMsgs([]);
    setReported(false);
    setBuddyState("none");
    setState("searching");
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Speed-Chat</h1>
        <p className="mt-2 text-muted-foreground">
          2 minutes with a random stranger. Both tap “Extend” for 2 more. Be kind — phone numbers, emails, addresses and links are blurred automatically.
        </p>

        {loading ? null : !user ? (
          <div className="glass mt-8 rounded-3xl p-6">
            <p className="text-sm">Sign in to get matched. You stay anonymous.</p>
            <Link to="/auth" search={{ redirect: "/speed-chat" }} className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Sign in to start
            </Link>
          </div>
        ) : state === "idle" || state === "ended" ? (
          <div className="glass mt-8 rounded-3xl p-8 text-center">
            {state === "ended" ? <p className="mb-4 text-sm text-muted-foreground">The chat has ended.</p> : null}
            {state === "ended" && match && !reported && msgs.length > 0 ? (
              <div className="mx-auto mb-5 max-w-sm rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
                <p className="font-semibold">Had a good conversation?</p>
                <p className="mt-1 text-muted-foreground">Become anonymous buddies — codenames only, one kind note a day.</p>
                <button type="button" disabled={buddyState !== "none"} onClick={() => void becomeBuddies()} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">
                  <Users className="size-4" /> {buddyState === "none" ? "Become buddies" : buddyState === "pending" ? "Request sent" : "Buddies ✓"}
                </button>
                {buddyState !== "none" ? <p className="mt-2"><Link to="/buddies" className="text-primary underline">Go to your buddies</Link></p> : null}
              </div>
            ) : null}
            {rotateIn !== null ? (
              <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
                Next stranger in {rotateIn}s ·{" "}
                <button type="button" onClick={() => setAutoRotate(false)} className="text-primary underline">Stop</button>
              </p>
            ) : null}
            <button
              type="button"
              onClick={startSearch}
              className="glow-cta rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground"
            >
              {state === "ended" ? "Find someone new" : "Find a stranger"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">3 speed-chats per day · 1 credit per message you send</p>
            <label className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Automatically find the next person when time's up
            </label>
            <p className="mt-4 text-xs text-muted-foreground">
              Prefer someone who's always ready to listen?{" "}
              <Link to="/" search={{ chat: 1 }} className="text-primary underline">Chat with a chat partner</Link>
            </p>
          </div>
        ) : state === "searching" ? (
          <div className="glass mt-8 rounded-3xl p-8 text-center">
            <div className="mx-auto size-16 animate-ping rounded-full bg-primary/40" />
            <p className="mt-6 text-sm">Looking for someone…</p>
            <button
              type="button"
              onClick={() => {
                void supabase.rpc("speed_leave_queue");
                setState("idle");
              }}
              className="mt-4 text-sm text-muted-foreground underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="glass mt-8 flex h-[32rem] flex-col rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className={`font-display text-2xl tabular-nums ${left <= 10 ? "text-destructive" : ""}`}>
                {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={report} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-destructive/50 px-3 py-1 text-sm text-destructive hover:bg-destructive/10">
                  <Flag className="size-4" /> Report / Block
                </button>
                <button type="button" onClick={() => match && void supabase.rpc("speed_end", { _match_id: match.id })} className="rounded-full border border-border px-3 py-1 text-sm">
                  Leave
                </button>
              </div>
            </div>
            {left <= 10 ? (
              <div className="flex items-center justify-between gap-2 bg-primary/10 px-4 py-2 text-sm">
                <span>{iExtended ? (theyExtended ? "Extending…" : "Waiting for them…") : theyExtended ? "They want more time!" : "Time's almost up"}</span>
                <button type="button" disabled={iExtended} onClick={() => match && void supabase.rpc("speed_extend", { _match_id: match.id })} className="rounded-full bg-primary px-3 py-1 font-semibold text-primary-foreground disabled:opacity-50">
                  Extend (+2 min)
                </button>
              </div>
            ) : null}
            <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
              {msgs.length === 0 ? <p className="text-center text-muted-foreground">You're connected. Say hi 👋</p> : null}
              {msgs.map((m) => (
                <p key={m.id} className={m.user_id === user.id ? "ml-auto w-fit max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground" : "w-fit max-w-[80%] rounded-2xl bg-muted px-3 py-2"}>
                  <MaskedText text={m.body} />
                </p>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2 border-t border-border p-3">
              <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder="Type a message…" className="flex-1 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm" />
              <button type="submit" aria-label="Send" className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Send className="size-4" />
              </button>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
