import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/native";
import { playSfx } from "@/lib/sfx";
import { openSos } from "@/lib/safety";
import { HELPLINES } from "@/data/helplines";
import { Celebration } from "@/components/site/Celebration";

const TOTAL = 60;
// 4s in, 2s hold, 6s out = 12s cycle → 5 calm breaths in 60s
const phaseAt = (t: number) => {
  const c = t % 12;
  if (c < 4) return { label: "Breathe in", scale: 1 };
  if (c < 6) return { label: "Hold", scale: 1 };
  return { label: "Breathe out", scale: 0.55 };
};

/** Small always-visible SOS pill (header). */
export function SosButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic(15);
        openSos();
      }}
      aria-label="Mood SOS: 60-second calming breath"
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 text-xs font-bold tracking-wide text-primary ${className}`}
    >
      <LifeBuoy className="size-4" aria-hidden /> SOS
    </button>
  );
}

/** Full-screen 60-second guided breathing for acute stress, with helplines. */
export function SosOverlay() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(0);
  const [done, setDone] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const lastPhase = useRef("");

  useEffect(() => {
    const onOpen = () => {
      setT(0);
      setDone(false);
      setOpen(true);
    };
    window.addEventListener("at:sos", onOpen);
    return () => window.removeEventListener("at:sos", onOpen);
  }, []);

  useEffect(() => {
    if (!open || done) return;
    const id = window.setInterval(() => setT((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, done]);

  useEffect(() => {
    if (!open) return;
    const p = phaseAt(t).label;
    if (p !== lastPhase.current) {
      lastPhase.current = p;
      haptic(p === "Breathe in" ? 30 : 12);
    }
    if (t >= TOTAL && !done) {
      setDone(true);
      playSfx("levelup");
      if (user) {
        void supabase.rpc("complete_sos").then(({ data }) => {
          const row = (data as { streak: number; reward: number }[] | null)?.[0];
          if (!row) return;
          if (row.reward > 0) {
            setCelebrate(`${row.streak}-day calm streak! +${row.reward} bonus credits 💛`);
            void qc.invalidateQueries({ queryKey: ["account"] });
          } else if (row.streak > 1) toast.success(`${row.streak}-day calm streak. Keep it going.`);
        });
      }
    }
  }, [t, open, done, user, qc]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return celebrate ? <Celebration message={celebrate} onDone={() => setCelebrate(null)} /> : null;
  const phase = phaseAt(t);
  const left = Math.max(0, TOTAL - t);

  return (
    <div role="dialog" aria-modal="true" aria-label="Mood SOS breathing" className="sos-sky fixed inset-0 z-[90] flex flex-col items-center overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-foreground">
      <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="self-end grid size-12 place-items-center rounded-full bg-background/40">
        <X className="size-5" />
      </button>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {!done ? (
          <>
            <p className="text-sm text-muted-foreground">You're safe right now. Just follow the circle.</p>
            <div className="relative my-10 grid size-64 place-items-center">
              <div
                className="absolute inset-0 rounded-full bg-primary/25 shadow-[0_0_80px_var(--primary)] transition-transform ease-in-out"
                style={{ transform: `scale(${phase.scale})`, transitionDuration: phase.label === "Breathe out" ? "6s" : "4s" }}
              />
              <div className="relative">
                <p className="font-display text-3xl font-semibold" aria-live="polite">{phase.label}</p>
                <p className="mt-2 tabular-nums text-muted-foreground">{left}s</p>
              </div>
            </div>
          </>
        ) : (
          <div className="my-10 max-w-sm">
            <p className="text-5xl" aria-hidden>🌊</p>
            <h2 className="mt-4 font-display text-3xl font-semibold">Well done.</h2>
            <p className="mt-2 text-muted-foreground">Notice your shoulders, your jaw, your hands. A little softer than a minute ago.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => { setT(0); setDone(false); }} className="min-h-12 rounded-full border border-border px-5 text-sm">Another minute</button>
              <a href="/?chat=1" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Talk to someone</a>
            </div>
            {!user ? <p className="mt-4 text-xs text-muted-foreground">Sign in to build a calm streak — 3 days earns 2 bonus credits, 7 days earns 5.</p> : null}
          </div>
        )}
      </div>
      <details className="w-full max-w-md rounded-2xl border border-border bg-background/60 p-4 text-sm backdrop-blur">
        <summary className="min-h-10 cursor-pointer font-semibold">Need to talk to someone right now?</summary>
        <ul className="mt-3 space-y-2">
          {HELPLINES.map((h) => (
            <li key={h.country}>
              <a href={`tel:${h.tel}`} className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-card px-3">
                <span>{h.flag} {h.name}</span>
                <span className="font-semibold text-primary">{h.tel}</span>
              </a>
            </li>
          ))}
        </ul>
        <a href="/help" onClick={() => setOpen(false)} className="mt-3 inline-block text-primary underline">All helplines</a>
      </details>
    </div>
  );
}
