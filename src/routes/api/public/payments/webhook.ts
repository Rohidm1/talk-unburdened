import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CREDIT_PACKAGES, type CreditPackageKey } from "@/lib/credit-packages";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

async function grantCredits(session: any) {
  const userId = session?.metadata?.userId as string | undefined;
  const packageKey = session?.metadata?.packageKey as CreditPackageKey | undefined;
  const sessionId = session?.id as string | undefined;

  if (!userId || !packageKey || !sessionId) {
    console.error("[payments] missing metadata on session", { userId, packageKey, sessionId });
    return;
  }
  const pkg = CREDIT_PACKAGES[packageKey];
  if (!pkg) {
    console.error("[payments] unknown package key", packageKey);
    return;
  }

  const { data: granted, error } = await getSupabase().rpc("grant_chat_credits", {
    _user_id: userId,
    _credits: pkg.credits,
    _cents: pkg.cents,
    _session: sessionId,
  });

  if (error) console.error("[payments] could not grant credits", error);
  else if (!granted) console.log("[payments] session already fulfilled", sessionId);
}

/**
 * Money went back to the customer (refund or lost dispute) — take the credits
 * back, prorated to the amount returned, and put the account on hold.
 */
async function clawBack(
  charge: any,
  env: StripeEnv,
  opts: { ref: string; kind: string; amountCents: number; block: boolean },
) {
  const paymentIntentId =
    typeof charge?.payment_intent === "string" ? charge.payment_intent : charge?.payment_intent?.id;

  let metadata = charge?.metadata ?? {};
  if ((!metadata.userId || !metadata.packageKey) && paymentIntentId) {
    try {
      const intent = await createStripeClient(env).paymentIntents.retrieve(paymentIntentId);
      metadata = { ...intent.metadata, ...metadata };
    } catch (e) {
      console.error("[payments] could not read payment intent metadata", e);
    }
  }

  const userId = metadata.userId as string | undefined;
  const packageKey = metadata.packageKey as CreditPackageKey | undefined;
  const pkg = packageKey ? CREDIT_PACKAGES[packageKey] : undefined;

  if (!userId || !pkg) {
    console.error("[payments] cannot attribute refund/dispute", { ref: opts.ref, userId });
    return;
  }

  const ratio = Math.min(Math.max(opts.amountCents / pkg.cents, 0), 1);
  const credits = Math.round(pkg.credits * ratio);

  const { error } = await getSupabase().rpc("revoke_chat_credits", {
    _user_id: userId,
    _credits: credits,
    _cents: opts.amountCents,
    _ref: opts.ref,
    _kind: opts.kind,
    _block: opts.block,
  });

  if (error) console.error("[payments] could not revoke credits", error);
  else console.log("[payments] revoked credits", { userId, credits, ref: opts.ref });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") await grantCredits(session);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await grantCredits(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      console.log("[payments] delayed payment failed", event.data.object?.id);
      break;
    case "charge.refunded": {
      const charge = event.data.object;
      await clawBack(charge, env, {
        ref: `refund:${charge.id}:${charge.amount_refunded}`,
        kind: "refund",
        amountCents: charge.amount_refunded ?? 0,
        block: true,
      });
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object;
      await clawBack({ payment_intent: dispute.payment_intent, metadata: dispute.metadata }, env, {
        ref: `dispute:${dispute.id}`,
        kind: "dispute",
        amountCents: dispute.amount ?? 0,
        block: true,
      });
      break;
    }
    case "checkout.session.expired":
      console.log("[payments] checkout session expired", event.data.object?.id);
      break;
    default:
      console.log("[payments] unhandled event", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[payments] invalid env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments] webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
