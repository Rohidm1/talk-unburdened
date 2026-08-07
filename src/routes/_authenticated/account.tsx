import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Coins, CreditCard, LogOut, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyAccount, getMyChatSessions, updateAlias } from "@/lib/account.functions";
import { creditPackages } from "@/data/listeners";
import type { CreditPackageKey } from "@/lib/credit-packages";
import { CreditCheckoutDialog } from "@/components/site/CreditCheckoutDialog";
import { PaymentTestModeBanner } from "@/components/site/PaymentTestModeBanner";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { BillingDescriptorNotice } from "@/components/site/BillingDescriptorNotice";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your Anontalk account — credits and chat history" },
      {
        name: "description",
        content:
          "Manage your Anontalk alias, top up chat credits and review your anonymous chat history.",
      },
      { property: "og:title", content: "Your Anontalk account" },
      { property: "og:description", content: "Manage your alias, credits and chat history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchSessions = useServerFn(getMyChatSessions);
  const rename = useServerFn(updateAlias);
  const openPortal = useServerFn(createPortalSession);
  const [alias, setAlias] = useState("");
  const [checkoutKey, setCheckoutKey] = useState<CreditPackageKey | null>(null);

  const portalMutation = useMutation({
    mutationFn: async () => {
      const result = await openPortal({
        data: {
          returnUrl: `${window.location.origin}/account`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      return result.url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const sessions = useQuery({ queryKey: ["my-chat-sessions"], queryFn: () => fetchSessions() });

  const renameMutation = useMutation({
    mutationFn: (value: string) => rename({ data: { alias: value } }),
    onSuccess: () => {
      toast.success("Alias updated.");
      setAlias("");
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: () => toast.error("Alias must be 2-24 characters."),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const profile = account.data?.profile;
  const roles = account.data?.roles ?? [];
  const totalCredits = (profile?.chat_credits ?? 0) + (profile?.free_credits ?? 0);
  const paidCredits = profile?.chat_credits ?? 0;
  const freeCredits = profile?.free_credits ?? 0;
  const isBlocked = profile?.is_blocked ?? false;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-12 font-body">
      <PaymentTestModeBanner />
      <div className="pt-12" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Hey {profile?.alias ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in anonymously. Only your alias is visible to chat partners.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Find a chat partner</Link>
          </Button>
          {roles.includes("staff") ? (
            <Button variant="outline" asChild>
              <Link to="/staff">Agent desk</Link>
            </Button>
          ) : null}
          {roles.includes("admin") ? (
            <Button variant="outline" asChild>
              <Link to="/admin">Admin</Link>
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </div>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <Coins className="size-5" />
            <h2 className="font-display text-lg font-semibold">Chat balance</h2>
          </div>
          <p className="mt-4 font-display text-4xl tabular-nums">{totalCredits}</p>
          <p className="mt-1 text-sm text-muted-foreground">credits remaining (1 credit = 1 message)</p>

          {freeCredits > 0 ? (
            <p className="mt-2 text-sm text-primary">
              + {freeCredits} free starter credit{freeCredits === 1 ? "" : "s"}
            </p>
          ) : null}
          {paidCredits > 0 ? (
            <p className="text-sm text-muted-foreground">{paidCredits} paid credits</p>
          ) : null}

          {isBlocked ? (
            <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              This account is on hold after a refund or chargeback. Please contact support to
              restore chat access and top-ups.
            </p>
          ) : null}

          <div className="mt-5 grid gap-2">
            {creditPackages.map((p) => (
              <Button
                key={p.id}
                variant={p.popular ? "default" : "outline"}
                disabled={isBlocked}
                onClick={() => setCheckoutKey(p.key)}
              >
                +{p.credits} credits · € {p.priceEur.toFixed(2)}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Secure card payment. Credits are added automatically once the payment clears.
          </p>
          <BillingDescriptorNotice className="mt-2" />

          <Button
            variant="ghost"
            className="mt-4 w-full"
            disabled={portalMutation.isPending}
            onClick={() => portalMutation.mutate()}
          >
            <CreditCard className="size-4" />
            {portalMutation.isPending ? "Opening…" : "Payment methods & invoices"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Opens your secure billing portal in a new tab.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Your alias</h2>
          <p className="mt-1 text-sm text-muted-foreground">Change how chat partners see you.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Label htmlFor="alias">New alias</Label>
            <Input
              id="alias"
              value={alias}
              placeholder={profile?.alias ?? "Anon"}
              maxLength={24}
              onChange={(e) => setAlias(e.target.value)}
            />
            <Button
              className="mt-2"
              disabled={alias.trim().length < 2 || renameMutation.isPending}
              onClick={() => renameMutation.mutate(alias.trim())}
            >
              Save alias
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Recent chats</h2>
        </div>
        {sessions.data && sessions.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {sessions.data.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">
                  {new Date(s.started_at).toLocaleString()}
                </span>
                <span className="tabular-nums">{s.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No chats yet.</p>
        )}
      </section>
      <CreditCheckoutDialog packageKey={checkoutKey} onClose={() => setCheckoutKey(null)} />
    </main>
  );
}
