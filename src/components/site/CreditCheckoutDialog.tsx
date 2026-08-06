import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { BillingDescriptorNotice } from "@/components/site/BillingDescriptorNotice";
import type { CreditPackageKey } from "@/lib/credit-packages";
import { createCreditCheckout } from "@/lib/payments.functions";

type Props = {
  packageKey: CreditPackageKey | null;
  onClose: () => void;
};

function CheckoutFrame({ packageKey }: { packageKey: CreditPackageKey }) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createCreditCheckout({
      data: {
        packageKey,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret returned");
    return result.clientSecret;
  }, [packageKey]);

  return (
    <div id="checkout" className="max-h-[70vh] overflow-y-auto">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

export function CreditCheckoutDialog({ packageKey, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!packageKey} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{t("pricing.buy")}</DialogTitle>
        </DialogHeader>
        {packageKey ? <CheckoutFrame key={packageKey} packageKey={packageKey} /> : null}
        <BillingDescriptorNotice className="border-t border-border pt-3" />
      </DialogContent>
    </Dialog>
  );
}
