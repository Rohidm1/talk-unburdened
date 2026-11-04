import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type ReportTarget = { type: "community_post" | "speed_chat" | "chat" | "buddy" | "bottle"; id: string; canBlock?: boolean; onDone?: () => void };

const REASONS = ["Harassment or bullying", "Hate or slurs", "Sexual or dating advances", "Spam or advertising", "Sharing private info", "Something else"];

/** Opens the shared report/block sheet from anywhere. */
export function openReport(target: ReportTarget) {
  window.dispatchEvent(new CustomEvent("at:report", { detail: target }));
}

/** Small reusable "Report" button. */
export function ReportButton({ target, label = "Report", className = "" }: { target: ReportTarget; label?: string; className?: string }) {
  return (
    <button type="button" onClick={() => openReport(target)} className={`inline-flex min-h-10 items-center gap-1 text-xs text-muted-foreground hover:text-destructive ${className}`}>
      <Flag className="size-3.5" aria-hidden /> {label}
    </button>
  );
}

export function ReportDialog() {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const [reason, setReason] = useState(REASONS[0]!);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      setTarget((e as CustomEvent<ReportTarget>).detail);
      setReason(REASONS[0]!);
      setDetails("");
      setBlock(true);
    };
    window.addEventListener("at:report", on);
    return () => window.removeEventListener("at:report", on);
  }, []);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    const canBlock = target.canBlock !== false && target.type !== "chat";
    const { error } = await supabase.rpc("report_content", {
      _target_type: target.type,
      _target_id: target.id,
      _reason: details ? `${reason}: ${details}` : reason,
      _block: canBlock && block,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("auth") ? "Please sign in to report." : error.message.includes("own_content") ? "You can't report your own post." : "The report could not be sent. Please try again.");
      return;
    }
    toast.success(canBlock && block ? "Reported and blocked. You won't see this person again." : "Thanks — our team will review this.");
    target.onDone?.();
    setTarget(null);
  };

  const canBlock = !!target && target.canBlock !== false && target.type !== "chat";

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display"><Flag className="size-5 text-destructive" /> Report</DialogTitle>
          <DialogDescription>Reports are private. Our team reviews every one.</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2">
          <legend className="sr-only">Reason</legend>
          {REASONS.map((r) => (
            <label key={r} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm ${reason === r ? "border-primary bg-primary/10" : "border-border"}`}>
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--primary)]" />
              {r}
            </label>
          ))}
        </fieldset>
        <textarea value={details} onChange={(e) => setDetails(e.target.value.slice(0, 200))} rows={2} placeholder="Anything else? (optional)" className="w-full rounded-xl border border-input bg-background/50 p-3 text-sm" />
        {canBlock ? (
          <label className="flex min-h-12 items-center gap-3 text-sm">
            <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="size-5 accent-[var(--primary)]" />
            Also block this person
          </label>
        ) : null}
        <Button variant="destructive" className="min-h-12" disabled={busy} onClick={() => void submit()}>{busy ? "Sending…" : "Send report"}</Button>
      </DialogContent>
    </Dialog>
  );
}
