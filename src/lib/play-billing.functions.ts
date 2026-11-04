import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PACKAGE_BY_PLAY_PRODUCT_ID, totalCredits } from "@/lib/credit-packages";

/**
 * Verifies a Google Play purchase with Google and adds the credits once.
 * Used both right after buying and by "Restore purchases" (safe to repeat).
 */
export const redeemPlayPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ productId: z.string().min(1).max(100), purchaseToken: z.string().min(10).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const pkg = PACKAGE_BY_PLAY_PRODUCT_ID[data.productId];
    if (!pkg) return { ok: false as const, error: "Unknown product." };
    const { verifyPlayPurchase, consumePlayPurchase } = await import("@/lib/play-billing.server");
    let purchase;
    try {
      purchase = await verifyPlayPurchase(data.productId, data.purchaseToken);
    } catch (e) {
      const msg = e instanceof Error && e.message === "play_not_configured"
        ? "Google Play payments are not switched on yet. Please use card or iDEAL."
        : "Google Play could not confirm this purchase.";
      return { ok: false as const, error: msg };
    }
    if (purchase.purchaseState !== 0) return { ok: false as const, error: "This purchase is not completed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: granted, error } = await supabaseAdmin.rpc("grant_google_play_credits", {
      _user_id: context.userId,
      _credits: totalCredits(pkg),
      _cents: pkg.cents,
      _purchase_token: data.purchaseToken,
    });
    if (error) return { ok: false as const, error: "Credits could not be added. Please tap Restore purchases." };
    await consumePlayPurchase(data.productId, data.purchaseToken).catch(() => undefined);
    return { ok: true as const, granted: !!granted, credits: totalCredits(pkg) };
  });
