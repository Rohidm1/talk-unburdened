/**
 * Google Play Billing inside the Android app (Trusted Web Activity), via the
 * Digital Goods API + Payment Request API. Only available when the site runs
 * inside the Play Store app; on the web these helpers report "unavailable".
 */
export const PLAY_BILLING_METHOD = "https://play.google.com/billing";

type DigitalGoodsService = {
  getDetails(ids: string[]): Promise<{ itemId: string; title: string; price: { currency: string; value: string } }[]>;
  listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]>;
  consume(purchaseToken: string): Promise<void>;
};

declare global {
  interface Window {
    getDigitalGoodsService?: (method: string) => Promise<DigitalGoodsService | null>;
  }
}

export async function getPlayBilling(): Promise<DigitalGoodsService | null> {
  if (typeof window === "undefined" || !window.getDigitalGoodsService) return null;
  try {
    return (await window.getDigitalGoodsService(PLAY_BILLING_METHOD)) ?? null;
  } catch {
    return null;
  }
}

/** Opens the Google Play purchase sheet; resolves with the purchase token. */
export async function buyWithPlay(productId: string): Promise<{ token: string; complete: (ok: boolean) => Promise<void> }> {
  const request = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku: productId } }],
    { total: { label: "Total", amount: { currency: "USD", value: "0" } } },
  );
  const response = await request.show();
  const token = (response.details as { purchaseToken?: string }).purchaseToken;
  if (!token) {
    await response.complete("fail");
    throw new Error("Google Play did not return a purchase.");
  }
  return { token, complete: (ok) => response.complete(ok ? "success" : "fail") };
}
