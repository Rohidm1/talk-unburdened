import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const BILLING_DESCRIPTOR_NOTICE =
  "Please note: For your privacy, this transaction will appear discreetly as HELP & SUPPORT DESK on your bank statement.";

export function BillingDescriptorNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span>{BILLING_DESCRIPTOR_NOTICE}</span>
    </p>
  );
}
