import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { BillingDescriptorNotice } from "@/components/site/BillingDescriptorNotice";
import type { CreditPackageKey } from "@/lib/credit-packages";
import { createCreditCheckout, getCheckoutFulfillment } from "@/lib/payments.functions";

type Props = {
  packageKey: CreditPackageKey | null;
  onClose: () => void;
  onPurchased?: () => void;
};

function CheckoutFrame({ packageKey, onPurchased }: { packageKey: CreditPackageKey; onPurchased?: () => void }) {
  const createCheckout = useServerFn(createCreditCheckout);
  const check = useServerFn(getCheckoutFulfillment);
  const queryClient = useQueryClient();
  const session = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createCheckout({
      data: {
        packageKey,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) { setError(result.error); toast.error(result.error); throw new Error(result.error); }
    if (!result.clientSecret) throw new Error("No client secret returned");
    session.current = result.sessionId;
    return result.clientSecret;
  }, [packageKey, createCheckout]);

  const onComplete = useCallback(async () => {
    const sessionId = session.current;
    if (!sessionId) return;
    setConfirming(true);
    try {
      for (let attempt = 0; attempt < 30; attempt++) {
        const result = await check({ data: { sessionId } });
        if (result.fulfilled) {
          await queryClient.invalidateQueries({ queryKey: ["account"] });
          toast.success("Credits added. You can keep chatting.");
          onPurchased?.();
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }
      setError("Payment confirmation is taking longer than usual. Your credits will appear once confirmed; please do not pay again.");
    } catch {
      setError("We could not check payment confirmation. Check your account balance before trying again.");
    }
  }, [check, queryClient, onPurchased]);

  return (
    <div id="checkout" className="max-h-[70vh] overflow-y-auto">
      {error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}
      {confirming ? <p role="status" className="mb-3 text-sm text-muted-foreground">Confirming your credits…</p> : null}
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret, onComplete }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

export function CreditCheckoutDialog({ packageKey, onClose, onPurchased }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!packageKey} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{t("pricing.buy")}</DialogTitle>
        </DialogHeader>
        {packageKey ? <CheckoutFrame key={packageKey} packageKey={packageKey} onPurchased={() => { onClose(); onPurchased?.(); }} /> : null}
        <BillingDescriptorNotice className="border-t border-border pt-3" />
      </DialogContent>
    </Dialog>
  );
}
