import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_PACKAGES } from "@/lib/credit-packages";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };
type FulfillmentResult = { fulfilled: boolean };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string | undefined; userId?: string | undefined },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0]!.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0]!;
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCreditCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        packageKey: z.enum(["starter", "popular", "pro_value", "vip_club"]),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const env: StripeEnv = data.environment;
      const pkg = CREDIT_PACKAGES[data.packageKey];
      const stripe = createStripeClient(env);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_blocked")
        .eq("id", context.userId)
        .maybeSingle();

      if (profile?.is_blocked) {
        return {
          error:
            "This account is on hold following a refund or chargeback. Please contact support before buying more credits.",
        };
      }

      const prices = await stripe.prices.list({ lookup_keys: [pkg.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0]!;

      // Guard against the Stripe dashboard price drifting from the app's own
      // catalogue — we must never charge an amount we did not display.
      if (stripePrice.unit_amount !== pkg.cents || stripePrice.currency !== "usd") {
        console.error("[payments] price mismatch", {
          priceId: pkg.priceId,
          expected: pkg.cents,
          actual: stripePrice.unit_amount,
          currency: stripePrice.currency,
        });
        return { error: "This package is temporarily unavailable. Please try again later." };
      }

      const productId =
        typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId: context.userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        automatic_tax: { enabled: true },
        customer_update: { address: "auto" },
        payment_intent_data: {
          description: product.name,
          statement_descriptor: "HELP & SUPPORT DESK",
          // Needed to attribute later refunds and disputes back to this user.
          metadata: { userId: context.userId, packageKey: pkg.key },
        },
        metadata: {
          userId: context.userId,
          packageKey: pkg.key,
          managed_payments: "false",
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Polled by the checkout return page so we only claim success once the
 * webhook has actually credited the account.
 */
export const getCheckoutFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().min(1).max(255) }).parse(input))
  .handler(async ({ data, context }): Promise<FulfillmentResult> => {
    const { data: tx } = await context.supabase
      .from("credit_transactions")
      .select("id")
      .eq("user_id", context.userId)
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();

    return { fulfilled: !!tx };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment as StripeEnv);

      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId: context.userId,
      });

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: data.returnUrl,
      });

      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
