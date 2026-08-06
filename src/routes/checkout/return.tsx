import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
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

  useEffect(() => {
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    }, 2000);
    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 text-center font-body">
      {sessionId ? (
        <>
          <CheckCircle2 className="size-12 text-primary" />
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
            Payment complete
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your credits are being added to your balance. This usually takes a few seconds.
          </p>
          <Button className="mt-7" onClick={() => void navigate({ to: "/account" })}>
            Go to my account
          </Button>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            No payment found
          </h1>
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
