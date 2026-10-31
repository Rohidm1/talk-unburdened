import { useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
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
import { CREDIT_PACKAGE_LIST, type CreditPackageKey } from "@/lib/credit-packages";

/** Shown when the customer's free credits run out or balance is low. */
export function TopUpDialog({
  open,
  reason,
  onClose,
  onPurchased,
}: {
  open: boolean;
  reason: "free_used" | "no_credit";
  onClose: () => void;
  onPurchased?: () => void;
}) {
  const [checkoutKey, setCheckoutKey] = useState<CreditPackageKey | null>(null);

  return (
    <>
      <Dialog open={open && !checkoutKey} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <MessageCircle className="size-5 text-primary" />
              {reason === "free_used" ? "Your free messages are used up!" : "You're out of credits"}
            </DialogTitle>
            <DialogDescription>
              Enjoying the support? Pick a package to keep chatting and unlock every option.
            </DialogDescription>
          </DialogHeader>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKAGE_LIST.map((p) => {
              const perCredit = p.cents / 100 / p.credits;
              return (
                <li key={p.key} className={`flex flex-col gap-3 rounded-lg border p-4 ${p.popular ? "border-primary bg-secondary" : "border-border bg-card"}`}>
                  <h3 className="font-display font-semibold">{{ starter: "Starter", popular: "Popular", pro_value: "Pro Value", vip_club: "VIP Club" }[p.key]}</h3>
                  <p className="font-display text-2xl font-semibold">${(p.cents / 100).toFixed(2)}</p>
                  <p className="text-sm">{p.credits} messages</p>
                  <p className="text-xs text-muted-foreground">${perCredit.toFixed(2)} per bericht · exclusief eventuele belasting</p>
                  <Button className="mt-auto w-full" onClick={() => setCheckoutKey(p.key)}>Buy Now</Button>
                </li>
              );
            })}
          </ul>

          <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />Secure payment via Stripe • Credits added instantly</p>

          <BillingDescriptorNotice className="border-t border-border pt-3" />

          <Button variant="ghost" onClick={onClose}>
            Misschien later
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
