import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fortuneText, wingLevel, WING_LEVELS } from "@/lib/wings";
import { haptic } from "@/lib/native";
import { Celebration } from "@/components/site/Celebration";

/** Daily login reward: open a fortune bottle for a quote + 1 bonus credit. */
export function DailyFortune({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [opening, setOpening] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const claim = useQuery({
    queryKey: ["fortune", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("fortune_claims").select("quote_index").eq("day", today).maybeSingle();
      return data?.quote_index ?? null;
    },
  });

  const open = async () => {
    setOpening(true);
    haptic([15, 30, 15]);
    const { data, error } = await supabase.rpc("claim_daily_fortune");
    setOpening(false);
    if (error) return void toast.error("The fortune bottle is stuck. Try again in a moment.");
    const row = (data as { quote_index: number; granted: boolean }[] | null)?.[0];
    if (!row) return;
    void qc.invalidateQueries({ queryKey: ["fortune"] });
    if (row.granted) {
      setCelebrate("+1 bonus credit — have a gentle day 💛");
      void qc.invalidateQueries({ queryKey: ["account"] });
    }
  };

  const quote = claim.data;

  return (
    <section className={`glass relative overflow-hidden rounded-3xl ${compact ? "p-5" : "p-6"}`} aria-labelledby="fortune-title">
      {celebrate ? <Celebration message={celebrate} onDone={() => setCelebrate(null)} /> : null}
      <h2 id="fortune-title" className="font-display text-lg font-semibold">Daily wellness fortune</h2>
      {!user ? (
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary underline">Sign in</Link> to open a fortune bottle every day — each one comes with 1 bonus credit.
        </p>
      ) : quote === null || quote === undefined ? (
        <div className="mt-3 flex items-center gap-4">
          <button type="button" onClick={() => void open()} disabled={opening || claim.isLoading} aria-label="Open today's fortune bottle" className={`grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/15 text-4xl ${opening ? "animate-bounce" : "bottle-float"}`}>
            🍾
          </button>
          <div>
            <p className="text-sm">Today's bottle is waiting.</p>
            <button type="button" onClick={() => void open()} disabled={opening || claim.isLoading} className="mt-2 min-h-12 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              {opening ? "Opening…" : "Open (+1 credit)"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-display text-xl leading-snug">“{fortuneText(quote)}”</p>
          <p className="mt-2 text-xs text-muted-foreground">Come back tomorrow for a new bottle.</p>
        </div>
      )}
    </section>
  );
}

/** Support Wings reputation card. */
export function WingsCard() {
  const { user } = useAuth();
  const wings = useQuery({
    queryKey: ["wings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("my_wings");
      return (data as number | null) ?? 0;
    },
  });
  if (!user) return null;
  const pts = wings.data ?? 0;
  const lvl = wingLevel(pts);
  return (
    <section className="rounded-3xl border border-border bg-card p-6" aria-labelledby="wings-title">
      <h2 id="wings-title" className="font-display text-lg font-semibold">Support Wings</h2>
      <p className="mt-3 flex items-center gap-3">
        <span className="text-4xl" aria-hidden>{lvl.emoji}</span>
        <span>
          <span className="block font-display text-2xl font-semibold">{lvl.name}</span>
          <span className="block text-sm text-muted-foreground">{pts} wings</span>
        </span>
      </p>
      {lvl.next ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(lvl.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{lvl.next.min - pts} more to become {lvl.next.emoji} {lvl.next.name}</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-primary">Highest level reached. Thank you for lighting the way.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Earn wings by replying in the community, getting upvotes, sending bottle echoes and buddy notes, and joining Speed Chats. Levels: {WING_LEVELS.map((l) => l.name).join(" → ")}.
      </p>
    </section>
  );
}

/** Invite-a-friend card: 5 bonus credits for both. */
export function InviteCard({ code }: { code: string | null | undefined }) {
  const [url, setUrl] = useState("");
  const referrals = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const { count } = await supabase.from("referrals").select("referred_id", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  useEffect(() => {
    if (code) setUrl(`${window.location.origin}/invite/${code}`);
  }, [code]);
  if (!code) return null;

  const share = async () => {
    haptic(10);
    const text = "I use Anontalk to talk things through anonymously. Join with my link and we both get 5 free credits:";
    if (navigator.share) {
      await navigator.share({ title: "Anontalk", text, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Invite copied.");
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6" aria-labelledby="invite-title">
      <h2 id="invite-title" className="flex items-center gap-2 font-display text-lg font-semibold"><Gift className="size-5 text-primary" /> Invite a friend</h2>
      <p className="mt-2 text-sm text-muted-foreground">When a friend signs up with your link and confirms their email, you <strong>both</strong> get 5 bonus credits.</p>
      <div className="mt-4 flex gap-2">
        <input readOnly value={url} aria-label="Your invite link" className="min-h-12 flex-1 rounded-xl border border-input bg-background/50 px-3 text-sm" />
        <button type="button" aria-label="Copy invite link" onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success("Link copied."))} className="grid size-12 place-items-center rounded-xl border border-border"><Copy className="size-4" /></button>
      </div>
      <button type="button" onClick={() => void share()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"><Share2 className="size-4" /> Share invite</button>
      {referrals.data ? <p className="mt-3 text-xs text-muted-foreground">{referrals.data} friend{referrals.data === 1 ? "" : "s"} joined through you.</p> : null}
    </section>
  );
}
