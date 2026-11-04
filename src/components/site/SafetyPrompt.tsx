import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { openSos, type SafetyLevel } from "@/lib/safety";
import { HELPLINES } from "@/data/helplines";

type Pending = { level: Exclude<SafetyLevel, "ok">; resolve: (send: boolean) => void };

/** Gentle pre-send check driven by `confirmSafeToSend()`. */
export function SafetyPrompt() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const on = (e: Event) => setPending((e as CustomEvent<Pending>).detail);
    window.addEventListener("at:safety", on);
    return () => window.removeEventListener("at:safety", on);
  }, []);

  const finish = (send: boolean) => {
    pending?.resolve(send);
    setPending(null);
  };

  return (
    <Dialog open={!!pending} onOpenChange={(o) => !o && finish(false)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {pending?.level === "selfharm" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display"><HeartHandshake className="size-5 text-primary" /> We're glad you said something</DialogTitle>
              <DialogDescription>
                It sounds like things are really heavy right now. You deserve support from someone who can help immediately.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-sm">
              {HELPLINES.map((h) => (
                <li key={h.country}>
                  <a href={`tel:${h.tel}`} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3">
                    <span>{h.flag} {h.name}</span>
                    <span className="font-semibold text-primary">{h.tel}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">In immediate danger, call 112 (Europe) or 911 (US).</p>
            <div className="grid gap-2">
              <Button className="min-h-12" onClick={() => { finish(false); openSos(); }}>Take a calming minute (SOS)</Button>
              <Button variant="outline" className="min-h-12" onClick={() => finish(true)}>Send my message anyway</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Pause for a second?</DialogTitle>
              <DialogDescription>
                This message might hurt someone. Anontalk works because people feel safe here. Want to say it another way?
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Button className="min-h-12" onClick={() => finish(false)}>Edit my message</Button>
              <Button variant="ghost" className="min-h-12" onClick={() => { finish(false); openSos(); }}>I'm upset — help me calm down</Button>
              <Button variant="outline" className="min-h-12" onClick={() => finish(true)}>Send anyway</Button>
            </div>
            <p className="text-xs text-muted-foreground">Severe insults are blocked automatically and repeated abuse can lead to suspension.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
