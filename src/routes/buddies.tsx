import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, Send, UserMinus } from "lucide-react";
import "@/lib/i18n";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Sections";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { markSeen } from "@/hooks/useBadges";
import { ReportButton } from "@/components/site/ReportDialog";
import { confirmSafeToSend } from "@/lib/safety";
import { haptic } from "@/lib/native";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/buddies")({
  head: () =>
    pageHead({
      title: "Anonymous Buddies – Daily Encouragement | Anontalk",
      description: "Stay in touch with people you clicked with in Speed Chat. Codenames only, one free kind note per day.",
      path: "/buddies",
    }),
  component: BuddiesPage,
});

type Buddy = { id: string; user_a: string; user_b: string; codename_a: string; codename_b: string; requested_by: string; status: string; created_at: string };
type Note = { id: string; buddy_id: string; sender_id: string; body: string; created_at: string };

const STARTERS = ["Thinking of you today 💛", "You've got this.", "Proud of you for keeping going.", "Hope today is a little lighter.", "Remember to drink some water and breathe."];

function BuddiesPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    markSeen("buddies");
  }, []);

  const buddies = useQuery({
    queryKey: ["buddies", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("buddies").select("*").neq("status", "ended").order("created_at", { ascending: false });
      return (data ?? []) as Buddy[];
    },
  });

  const notes = useQuery({
    queryKey: ["buddy-notes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("buddy_notes").select("*").order("created_at", { ascending: true }).limit(500);
      return (data ?? []) as Note[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("buddy-notes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "buddy_notes" }, () => {
        void qc.invalidateQueries({ queryKey: ["buddy-notes"] });
        markSeen("buddies");
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const respond = async (id: string, accept: boolean) => {
    await supabase.rpc("buddy_respond", { _buddy_id: id, _accept: accept });
    if (accept) toast.success("You're buddies now 🤝");
    void qc.invalidateQueries({ queryKey: ["buddies"] });
  };

  const end = async (id: string) => {
    if (!window.confirm("End this buddy connection? Your notes will no longer be shared.")) return;
    await supabase.rpc("buddy_end", { _buddy_id: id });
    void qc.invalidateQueries({ queryKey: ["buddies"] });
  };

  const list = buddies.data ?? [];
  const active = list.filter((b) => b.status === "active");
  const pending = list.filter((b) => b.status === "pending");

  return (
    <div className="min-h-dvh bg-background font-body text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Anonymous Buddies</h1>
        <p className="mt-3 text-muted-foreground">
          Clicked with someone in Speed Chat? Stay connected with codenames only. Send one free note of encouragement per buddy, per day.
        </p>

        {loading ? null : !user ? (
          <div className="glass mt-8 rounded-3xl p-6">
            <p className="text-sm">Sign in to see your buddies.</p>
            <Link to="/auth" search={{ redirect: "/buddies" }} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Sign in</Link>
          </div>
        ) : (
          <>
            {pending.length ? (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">Requests</h2>
                <ul className="mt-3 space-y-3">
                  {pending.map((b) => {
                    const mine = b.requested_by === user.id;
                    const other = b.user_a === user.id ? b.codename_b : b.codename_a;
                    return (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                        <span className="text-sm">{mine ? `Waiting for ${other} to accept…` : `${other} wants to be anonymous buddies`}</span>
                        {mine ? (
                          <button type="button" onClick={() => void end(b.id)} className="min-h-10 text-xs text-muted-foreground underline">Cancel</button>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void respond(b.id, true)} className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Accept</button>
                            <button type="button" onClick={() => void respond(b.id, false)} className="min-h-10 rounded-full border border-border px-4 text-sm">Decline</button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold">Your buddies</h2>
              {active.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No buddies yet. After a good Speed Chat, tap <strong>“Become buddies”</strong> — if they tap it too, you're connected.
                  <div className="mt-4"><Link to="/speed-chat" className="inline-flex min-h-12 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground">Start a Speed Chat</Link></div>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {active.map((b) => {
                    const meA = b.user_a === user.id;
                    const myName = meA ? b.codename_a : b.codename_b;
                    const theirName = meA ? b.codename_b : b.codename_a;
                    const thread = (notes.data ?? []).filter((n) => n.buddy_id === b.id);
                    const sentToday = thread.some((n) => n.sender_id === user.id && new Date(n.created_at).toDateString() === new Date().toDateString());
                    return (
                      <li key={b.id} className="rounded-2xl border border-border bg-card p-4">
                        <button type="button" onClick={() => setOpenId(openId === b.id ? null : b.id)} className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
                          <span>
                            <span className="block font-semibold">🤝 {theirName}</span>
                            <span className="block text-xs text-muted-foreground">You appear as {myName} · {thread.length} notes</span>
                          </span>
                          <Heart className={`size-5 ${sentToday ? "fill-primary text-primary" : "text-muted-foreground"}`} aria-label={sentToday ? "Note sent today" : "No note yet today"} />
                        </button>
                        {openId === b.id ? (
                          <div className="mt-3 border-t border-border pt-3">
                            <div className="max-h-64 space-y-2 overflow-y-auto">
                              {thread.length === 0 ? <p className="text-sm text-muted-foreground">Send the first kind note.</p> : null}
                              {thread.map((n) => (
                                <p key={n.id} className={n.sender_id === user.id ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "w-fit max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm"}>
                                  {n.body}
                                </p>
                              ))}
                            </div>
                            {sentToday ? (
                              <p className="mt-3 text-xs text-muted-foreground">You've sent today's note. Come back tomorrow 💛</p>
                            ) : (
                              <NoteComposer buddyId={b.id} onSent={() => void qc.invalidateQueries({ queryKey: ["buddy-notes"] })} />
                            )}
                            <div className="mt-3 flex gap-4">
                              <ReportButton target={{ type: "buddy", id: b.id, onDone: () => void qc.invalidateQueries({ queryKey: ["buddies"] }) }} />
                              <button type="button" onClick={() => void end(b.id)} className="inline-flex min-h-10 items-center gap-1 text-xs text-muted-foreground"><UserMinus className="size-3.5" /> End connection</button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function NoteComposer({ buddyId, onSent }: { buddyId: string; onSent: () => void }) {
  const [text, setText] = useState("");
  const send = async () => {
    const body = text.trim();
    if (body.length < 2) return;
    if (!(await confirmSafeToSend(body))) return;
    const { error } = await supabase.rpc("send_buddy_note", { _buddy_id: buddyId, _body: body });
    if (error) {
      toast.error(error.message.includes("daily_limit") ? "One note per day — come back tomorrow." : error.message.includes("toxic") ? "That note breaks our rules." : "Could not send your note.");
      return;
    }
    haptic(15);
    setText("");
    toast.success("Note sent 💌");
    onSent();
  };
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {STARTERS.map((s) => (
          <button key={s} type="button" onClick={() => setText(s)} className="min-h-9 rounded-full border border-border px-3 text-xs">{s}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} placeholder="A kind note (free, 1 per day)" className="min-h-12 flex-1 rounded-xl border border-input bg-background/50 px-3 text-sm" />
        <button type="submit" aria-label="Send note" className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground"><Send className="size-4" /></button>
      </form>
    </div>
  );
}
