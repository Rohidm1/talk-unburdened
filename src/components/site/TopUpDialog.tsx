import { useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
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
}: {
  open: boolean;
  reason: "free_used" | "no_credit";
  onClose: () => void;
}) {
  const [checkoutKey, setCheckoutKey] = useState<CreditPackageKey | null>(null);

  return (
    <>
      <Dialog open={open && !checkoutKey} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <MessageCircle className="size-5 text-primary" />
              {reason === "free_used"
                ? "Je gratis berichten zijn op"
                : "Je hebt geen credits meer"}
            </DialogTitle>
            <DialogDescription>
              Kies een bundel om anoniem verder te chatten. Credits verlopen niet.
            </DialogDescription>
          </DialogHeader>

          <ul className="flex flex-col gap-2">
            {CREDIT_PACKAGE_LIST.map((p) => {
              const perCredit = p.cents / 100 / p.credits;
              return (
                <li key={p.key}>
                  <button
                    onClick={() => setCheckoutKey(p.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors hover:border-primary/60 ${
                      p.popular ? "border-primary/50 bg-secondary/40" : "border-border bg-secondary/20"
                    }`}
                  >
                    <span className="flex-1">
                      <span className="block font-display text-base font-semibold">
                        {p.credits} berichten
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        ${perCredit.toFixed(2)} per bericht
                      </span>
                    </span>
                    <span className="font-display text-xl font-semibold">
                      ${(p.cents / 100).toFixed(0)}
                    </span>
                    {p.popular ? (
                      <Sparkles className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <BillingDescriptorNotice className="border-t border-border pt-3" />

          <Button variant="ghost" onClick={onClose}>
            Misschien later
          </Button>
        </DialogContent>
      </Dialog>

      <CreditCheckoutDialog
        packageKey={checkoutKey}
        onClose={() => {
          setCheckoutKey(null);
          onClose();
        }}
      />
    </>
  );
}
