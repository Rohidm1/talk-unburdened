import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillingDescriptorNotice } from "@/components/site/BillingDescriptorNotice";
import { getCheckoutFulfillment } from "@/lib/payments.functions";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Payment complete — Anontalk credits added" },
      {
        name: "description",
        content: "Your Anontalk call credits are on their way to your balance.",
      },
      { property: "og:title", content: "Payment complete — Anontalk" },
      { property: "og:description", content: "Your call credits have been added." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const checkFulfillment = useServerFn(getCheckoutFulfillment);

  // Poll until the webhook has actually credited the account.
  const fulfillment = useQuery({
    queryKey: ["fulfillment", sessionId],
    enabled: !!sessionId,
    queryFn: () => checkFulfillment({ data: { sessionId: sessionId! } }),
    refetchInterval: (query) => (query.state.data?.fulfilled ? false : 2000),
  });

  const credited = fulfillment.data?.fulfilled ?? false;

  useEffect(() => {
    if (credited) void queryClient.invalidateQueries({ queryKey: ["account"] });
  }, [credited, queryClient]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 text-center font-body">
      {sessionId ? (
        <>
          {credited ? (
            <CheckCircle2 className="size-12 text-primary" />
          ) : (
            <Loader2 className="size-12 animate-spin text-primary" />
          )}
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
            {credited ? "Credits added" : "Confirming your payment"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {credited
              ? "Your talk time is on your balance and ready to use."
              : "Your payment went through. We're waiting for confirmation — this usually takes a few seconds."}
          </p>
          <Button className="mt-7" onClick={() => void navigate({ to: "/account" })}>
            Go to my account
          </Button>
          <BillingDescriptorNotice className="mt-6 max-w-sm text-left" />
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold tracking-tight">No payment found</h1>
          <p className="mt-3 text-muted-foreground">
            We couldn't find a checkout session for this page.
          </p>
          <Button asChild className="mt-7">
            <Link to="/">Back home</Link>
          </Button>
        </>
      )}
    </main>
  );
}
