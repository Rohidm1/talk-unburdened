import { LifeBuoy } from "lucide-react";
import { openSos } from "@/lib/safety";

/** Big, calm entry point to Mood SOS on the home screen. */
export function SosCard() {
  return (
    <section className="glass flex flex-col justify-between rounded-3xl p-5" aria-labelledby="sos-card-title">
      <div>
        <h2 id="sos-card-title" className="font-display text-lg font-semibold">Feeling panicky right now?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tap SOS for one guided minute of calm breathing. Helplines are one tap away too.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={openSos} className="glow-cta inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">
          <LifeBuoy className="size-5" aria-hidden /> SOS
        </button>
        <a href="/help" className="inline-flex min-h-12 items-center rounded-full border border-border px-5 text-sm">Crisis helplines</a>
      </div>
    </section>
  );
}
