import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, History, Smartphone, Trash2, Vibrate } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteMyAccount, getCreditHistory } from "@/lib/privacy.functions";
import { enableNotifications, haptic, hapticsEnabled, notificationsSupported, setHapticsEnabled } from "@/lib/native";
import { isMuted, setMuted } from "@/lib/sfx";
import { getAlertPrefs, setAlertPref, type AlertKind } from "@/lib/prefs";

const KIND_LABELS: Record<string, string> = {
  purchase: "Credits bought",
  signup_bonus: "Welcome bonus",
  chat_message: "Chat message",
  chat_usage: "Chat message",
  message: "Chat message",
  speed_message: "Speed Chat message",
  community_post: "Community post",
  community_reply: "Community reply",
  bottle_drop: "Bottle dropped",
  bottle_open: "Bottle opened",
  bottle_reply: "Bottle reply",
  refund: "Refund",
  daily_fortune: "Daily fortune bonus",
  sos_streak: "Calm streak reward",
  referral_bonus: "Invite bonus",
  chargeback: "Chargeback",
};

function kindLabel(kind: string) {
  const free = kind.startsWith("free_");
  const base = KIND_LABELS[free ? kind.slice(5) : kind] ?? kind.replace(/_/g, " ");
  return free ? `${base} (free credit)` : base;
}

export function CreditHistory() {
  const fetchHistory = useServerFn(getCreditHistory);
  const history = useQuery({ queryKey: ["credit-history"], queryFn: () => fetchHistory() });

  return (
    <section aria-labelledby="history-title" className="mt-8 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <History className="size-5 text-primary" aria-hidden />
        <h2 id="history-title" className="font-display text-lg font-semibold">Credit history</h2>
      </div>
      {history.data && history.data.length > 0 ? (
        <ul className="mt-4 max-h-80 divide-y divide-border overflow-y-auto">
          {history.data.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="block">{kindLabel(t.kind)}</span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("en-GB")}
                  {t.payment_source ? ` · ${t.payment_source === "google_play" ? "Google Play" : "Web checkout"}` : ""}
                  {t.amount_cents > 0 ? ` · $${(t.amount_cents / 100).toFixed(2)}` : ""}
                </span>
              </span>
              <span className={`tabular-nums font-semibold ${t.credits_delta > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {t.credits_delta > 0 ? "+" : ""}
                {t.credits_delta}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{history.isLoading ? "Loading…" : "No credit activity yet."}</p>
      )}
    </section>
  );
}

export function AppSettings() {
  const [notif, setNotif] = useState<NotificationPermission | "unsupported">("default");
  const [vibrate, setVibrate] = useState(true);
  const [sound, setSound] = useState(true);
  const [prefs, setPrefs] = useState<Record<AlertKind, boolean> | null>(null);

  useEffect(() => {
    setPrefs(getAlertPrefs());
    setNotif(notificationsSupported() ? Notification.permission : "unsupported");
    setVibrate(hapticsEnabled());
    setSound(!isMuted());
  }, []);

  return (
    <section aria-labelledby="settings-title" className="mt-8 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Smartphone className="size-5 text-primary" aria-hidden />
        <h2 id="settings-title" className="font-display text-lg font-semibold">App settings</h2>
      </div>
      <div className="mt-4 space-y-4">
        <div className="flex min-h-12 items-center justify-between gap-3">
          <Label className="flex items-center gap-2"><Bell className="size-4" aria-hidden /> Message alerts</Label>
          {notif === "granted" ? (
            <span className="text-sm text-primary">On</span>
          ) : notif === "unsupported" ? (
            <span className="text-sm text-muted-foreground">Not supported on this device</span>
          ) : notif === "denied" ? (
            <span className="text-sm text-muted-foreground">Blocked in browser settings</span>
          ) : (
            <Button variant="outline" className="min-h-12" onClick={async () => setNotif(await enableNotifications())}>Turn on</Button>
          )}
        </div>
        {prefs ? (
          <fieldset className="rounded-2xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold">Alert me about</legend>
            {([
              ["chat", "Chat replies"],
              ["bottles", "Bottle replies"],
              ["community", "Community replies"],
              ["buddies", "Buddy notes"],
              ["wellness", "Evening wellness check-ins"],
            ] as const).map(([k, label]) => (
              <div key={k} className="flex min-h-12 items-center justify-between gap-3">
                <Label htmlFor={`pref-${k}`}>{label}</Label>
                <Switch id={`pref-${k}`} checked={prefs[k]} onCheckedChange={(v) => { setAlertPref(k, v); setPrefs({ ...prefs, [k]: v }); }} />
              </div>
            ))}
          </fieldset>
        ) : null}
        <div className="flex min-h-12 items-center justify-between gap-3">
          <Label htmlFor="sound-switch">Alert sounds</Label>
          <Switch id="sound-switch" checked={sound} onCheckedChange={(v) => { setSound(v); setMuted(!v); }} />
        </div>
        <div className="flex min-h-12 items-center justify-between gap-3">
          <Label htmlFor="vibrate-switch" className="flex items-center gap-2"><Vibrate className="size-4" aria-hidden /> Vibration</Label>
          <Switch id="vibrate-switch" checked={vibrate} onCheckedChange={(v) => { setVibrate(v); setHapticsEnabled(v); if (v) haptic(20); }} />
        </div>
      </div>
    </section>
  );
}

export function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  const remove = useServerFn(deleteMyAccount);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => remove({ data: { confirm: "DELETE" } }),
    onSuccess: async (r) => {
      if (!r.ok) return void toast.error(r.error);
      queryClient.clear();
      await supabase.auth.signOut().catch(() => undefined);
      toast.success("Your account and data have been deleted.");
      void navigate({ to: "/", replace: true });
    },
    onError: () => toast.error("Your account could not be deleted. Please try again."),
  });

  return (
    <section aria-labelledby="delete-title" className="mt-8 rounded-3xl border border-destructive/40 bg-destructive/5 p-6">
      <div className="flex items-center gap-2 text-destructive">
        <Trash2 className="size-5" aria-hidden />
        <h2 id="delete-title" className="font-display text-lg font-semibold">Delete account & data</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        This permanently removes your account, credits, chats, posts, bottles and votes. It cannot be undone and remaining credits are lost.{" "}
        <a href="/delete-account" className="text-primary underline underline-offset-4">What gets deleted</a>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
          <Input id="delete-confirm" value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} className="mt-1 min-h-12" />
        </div>
        <Button
          variant="destructive"
          className="min-h-12"
          disabled={confirm !== "DELETE" || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </section>
  );
}
