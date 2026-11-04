import { useEffect, useState } from "react";
import { TopUpDialog } from "@/components/site/TopUpDialog";

/** Listens for `openPaywall()` from any page (bottles, community, Speed Chat…). */
export function GlobalPaywall() {
  const [reason, setReason] = useState<"free_used" | "no_credit" | "buy" | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => setReason(((e as CustomEvent).detail as "free_used" | "no_credit" | "buy") ?? "no_credit");
    window.addEventListener("at:paywall", onOpen);
    return () => window.removeEventListener("at:paywall", onOpen);
  }, []);

  return <TopUpDialog open={reason !== null} reason={reason ?? "no_credit"} onClose={() => setReason(null)} />;
}
