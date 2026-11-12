import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Gift, MessageCircle, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BillingDescriptorNotice } from "@/components/site/BillingDescriptorNotice";
import { CreditCheckoutDialog } from "@/components/site/CreditCheckoutDialog";
import { CREDIT_PACKAGE_LIST, PACKAGE_BY_PLAY_PRODUCT_ID, totalCredits, type CreditPackageDef, type CreditPackageKey } from "@/lib/credit-packages";
import { buyWithPlay, getPlayBilling } from "@/lib/play-billing";
import { redeemPlayPurchase } from "@/lib/play-billing.functions";
import { haptic } from "@/lib/native";

const NAMES: Record<CreditPackageKey, string> = { trial: "Try it", starter: "Starter", popular: "Most popular", pro_value: "Best value", vip_club: "VIP Club" };

type Method = "web" | "play";

/** Credit purchase sheet: user-choice billing between web checkout and Google Play. */
export function TopUpDialog({
  open,
  reason,
  onClose,
  onPurchased,
  partnerName,
}: {
  partnerName?: string | undefined;
  open: boolean;
  reason: "free_used" | "no_credit" | "buy";
  onClose: () => void;
  onPurchased?: () => void;
}) {
  const [checkoutKey, setCheckoutKey] = useState<CreditPackageKey | null>(null);
  const [method, setMethod] = useState<Method>("web");
  const [playReady, setPlayReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const redeem = useServerFn(redeemPlayPurchase);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    window.__lovableEvents?.track?.("project.paywall_opened", { reason, with_partner: !!partnerName });
    void getPlayBilling().then((s) => {
      setPlayReady(!!s);
      if (s) setMethod("play");
    });
  }, [open]);

  const done = async (credits: number) => {
    await queryClient.invalidateQueries({ queryKey: ["account"] });
    haptic([20, 40, 20]);
    toast.success(`${credits} credits added. You can keep chatting.`);
    onClose();
    onPurchased?.();
  };

  const buyPlay = async (p: CreditPackageDef) => {
    setBusy(p.key);
    try {
      const { token, complete } = await buyWithPlay(p.playProductId);
      const r = await redeem({ data: { productId: p.playProductId, purchaseToken: token } });
      await complete(r.ok);
      if (!r.ok) toast.error(r.error);
      else await done(r.credits);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error("The Google Play purchase did not complete.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      const service = await getPlayBilling();
      if (!service) {
        toast.info("Restore works in the Anontalk app from Google Play.");
        return;
      }
      const purchases = await service.listPurchases();
      let added = 0;
      for (const p of purchases) {
        if (!PACKAGE_BY_PLAY_PRODUCT_ID[p.itemId]) continue;
        const r = await redeem({ data: { productId: p.itemId, purchaseToken: p.purchaseToken } });
        if (r.ok && r.granted) added += r.credits;
      }
      if (added > 0) await done(added);
      else toast.info("No missing purchases found. Your credits are up to date.");
    } catch {
      toast.error("Purchases could not be restored. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const title =
    partnerName && reason !== "buy" ? `Keep talking with ${partnerName}`
    : reason === "free_used" ? "Your free messages are used up!" : reason === "no_credit" ? "You're out of credits" : "Buy credits";

  return (
    <>
      <Dialog open={open && !checkoutKey} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <MessageCircle className="size-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>
              {reason === "buy" ? "" : partnerName ? `${partnerName} is still here. Pick a package to carry on the conversation. ` : "Enjoying the support? Pick a package to keep chatting and unlock every option. "}
              1 credit = 1 message you send, everywhere on Anontalk. Replies from your chat partner are free.
            </DialogDescription>
          </DialogHeader>

          <div role="radiogroup" aria-label="Payment method" className="grid gap-2 sm:grid-cols-2">
            {([
              { id: "web", icon: CreditCard, label: "Web checkout", sub: "Card, iDEAL & more via Stripe" },
              { id: "play", icon: Smartphone, label: "Google Play", sub: playReady ? "Pay with your Play account" : "Available in the Android app" },
            ] as const).map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  method === m.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <m.icon className="size-5 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="block font-semibold">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CREDIT_PACKAGE_LIST.filter((p) => !(method === "play" && p.webOnly)).map((p) => {
              const total = totalCredits(p);
              const perCredit = p.cents / 100 / total;
              const disabled = method === "play" && !playReady;
              return (
                <li key={p.key} className={`relative flex flex-col gap-2 rounded-xl border p-4 ${p.popular ? "border-primary bg-secondary" : "border-border bg-card"}`}>
                  {p.popular ? (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">Most chosen</span>
                  ) : null}
                  <h3 className="font-display font-semibold">{NAMES[p.key]}</h3>
                  <p className="font-display text-2xl font-semibold">${(p.cents / 100).toFixed(2)}</p>
                  <p className="text-sm">
                    {p.credits} credits
                    {p.bonus > 0 ? (
                      <span className="ml-1 inline-flex items-center gap-1 font-semibold text-primary">
                        <Gift className="size-3.5" aria-hidden />+{p.bonus} free
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {total} messages · ${perCredit.toFixed(2)} each · excl. applicable tax
                  </p>
                  <Button
                    className="mt-auto min-h-12 w-full"
                    disabled={disabled || busy !== null}
                    onClick={() => {
                      haptic(10);
                      window.__lovableEvents?.track?.("project.checkout_started", { package: p.key, method });
                      if (method === "web") setCheckoutKey(p.key);
                      else void buyPlay(p);
                    }}
                  >
                    {busy === p.key ? "Opening…" : "Buy now"}
                  </Button>
                </li>
              );
            })}
          </ul>

          {method === "play" ? (
            <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
              {!playReady ? <p>Google Play payments work inside the Anontalk app from the Play Store. On this device, use web checkout.</p> : null}
              <Button variant="outline" className="min-h-12" disabled={busy !== null} onClick={() => void restore()}>
                <RotateCcw className="size-4" aria-hidden /> {busy === "restore" ? "Restoring…" : "Restore purchases"}
              </Button>
            </div>
          ) : (
            <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" aria-hidden />Secure payment via Stripe • Credits added instantly
            </p>
          )}

          <BillingDescriptorNotice className="border-t border-border pt-3" />

          <Button variant="ghost" className="min-h-12" onClick={onClose}>
            Maybe later
          </Button>
        </DialogContent>
      </Dialog>

      <CreditCheckoutDialog
        packageKey={checkoutKey}
        onPurchased={() => { setCheckoutKey(null); onClose(); onPurchased?.(); }}
        onClose={() => {
          setCheckoutKey(null);
          onClose();
        }}
      />
    </>
  );
}
