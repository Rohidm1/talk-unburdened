import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CREDIT_PACKAGES, type CreditPackageKey } from "@/lib/credit-packages";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

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

  const supabase = getSupabase();
  const seconds = pkg.minutes * 60;

  // Idempotency: the unique index on stripe_session_id rejects replays.
  const { error: txError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    seconds_delta: seconds,
    amount_cents: pkg.cents,
    kind: "purchase",
    stripe_session_id: sessionId,
  });

  if (txError) {
    if (txError.code === "23505") {
      console.log("[payments] session already fulfilled", sessionId);
      return;
    }
    console.error("[payments] could not record transaction", txError);
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("credit_seconds")
    .eq("id", userId)
    .maybeSingle();

  const current = profile?.credit_seconds ?? 0;
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credit_seconds: current + seconds })
    .eq("id", userId);

  if (updateError) console.error("[payments] could not update balance", updateError);
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
