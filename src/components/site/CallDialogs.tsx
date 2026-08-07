import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BellRing, Mic, MicOff, PhoneCall, PhoneOff } from "lucide-react";
import type { Call } from "@twilio/voice-sdk";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Listener } from "@/data/listeners";
import { LOW_BALANCE_WARNING_SECONDS, RATE_PER_MINUTE } from "@/lib/credit-packages";

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(seconds % 60, 0);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const RING_TIMEOUT_SECONDS = 45;

export function ActiveCallDialog({
  listener,
  allowanceSeconds,
  mode,
  onTick,
  onEnd,
  onNoAnswer,
  call,
}: {
  listener: Listener | null;
  allowanceSeconds: number;
  mode: "paid" | "free";
  /** Server heartbeat. Returns the authoritative remaining seconds. */
  onTick: () => Promise<{
    remaining: number;
    shouldEnd: boolean;
    answered: boolean;
    status: string;
  } | null>;
  onEnd: () => void;
  /** Nobody picked up, the agent declined, or the ringing timed out. */
  onNoAnswer: () => void;
  call?: Call | null;
}) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const [ringing, setRinging] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [muted, setMuted] = useState(false);
  const [remaining, setRemaining] = useState(allowanceSeconds);
  const endedRef = useRef(false);
  const answeredRef = useRef(false);

  useEffect(() => {
    if (!listener) return;
    setElapsed(0);
    setRinging(0);
    setAnswered(false);
    setMuted(false);
    setRemaining(allowanceSeconds);
    endedRef.current = false;
    answeredRef.current = false;
    const id = setInterval(() => {
      if (answeredRef.current) setElapsed((e) => e + 1);
      else setRinging((r) => r + 1);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listener]);

  // Nobody picked up in time.
  useEffect(() => {
    if (!listener || answered) return;
    if (ringing < RING_TIMEOUT_SECONDS) return;
    if (endedRef.current) return;
    endedRef.current = true;
    call?.disconnect();
    onNoAnswer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringing, answered, listener]);

  // The server decides when time is up; the local ticker is display only.
  useEffect(() => {
    if (!listener) return;
    let cancelled = false;

    const beat = async () => {
      const status = await onTick();
      if (cancelled || !status) return;
      if (status.answered && !answeredRef.current) {
        answeredRef.current = true;
        setAnswered(true);
        setElapsed(0);
      }
      if (!status.answered && (status.status === "declined" || status.status === "missing")) {
        if (endedRef.current) return;
        endedRef.current = true;
        call?.disconnect();
        onNoAnswer();
        return;
      }
      setRemaining(status.remaining);
      if (status.answered && status.shouldEnd && !endedRef.current) {
        endedRef.current = true;
        onEnd();
      }
    };

    void beat();
    const id = setInterval(() => void beat(), 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listener]);

  // Interpolate between heartbeats so the countdown stays smooth.
  const left = Math.max(Math.min(remaining, allowanceSeconds - elapsed), 0);
  const cost = mode === "free" ? 0 : (elapsed / 60) * RATE_PER_MINUTE;
  const lowOnTime = left <= LOW_BALANCE_WARNING_SECONDS;

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      call?.mute(next);
      return next;
    });
  };

  const hangUp = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    call?.disconnect();
    if (answeredRef.current) onEnd();
    else onNoAnswer();
  };

  return (
    <Dialog open={!!listener} onOpenChange={(o) => !o && hangUp()}>
      <DialogContent className="sm:max-w-md">
        {listener ? (
          <>
            <DialogHeader className="items-center text-center">
              <img
                src={listener.avatar}
                alt={listener.displayName}
                width={512}
                height={512}
                className={`size-24 rounded-full object-cover ring-2 ring-primary/50 ${answered ? "" : "animate-pulse"}`}
              />
              <DialogTitle className="mt-3 font-display text-xl">
                {answered ? `${t("call.inCall")} ${listener.displayName}` : listener.displayName}
              </DialogTitle>
              <DialogDescription>
                {answered ? t("call.liveAudio") : "De lijn gaat over… wacht tot er wordt opgenomen."}
              </DialogDescription>
            </DialogHeader>

            {answered ? (
              <>
                <div className="text-center font-display text-5xl tabular-nums">
                  {format(elapsed)}
                </div>

                {lowOnTime ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  {mode === "free"
                    ? "Your free check-in ends in under a minute."
                    : "Less than a minute of credit left — the call will end automatically."}
                </span>
              </div>
            ) : null}

            <div className={`grid gap-3 ${mode === "free" ? "grid-cols-2" : "grid-cols-3"}`}>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Talk time left</p>
                <p className="font-display text-lg text-primary tabular-nums">{format(left)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Talk time used</p>
                <p className="font-display text-lg tabular-nums">{format(elapsed)}</p>
              </div>
              {mode === "free" ? null : (
                <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{t("call.balance")}</p>
                  <p className="font-display text-lg tabular-nums">€ {cost.toFixed(2)}</p>
                </div>
              )}
            </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <PhoneCall className="size-8 animate-bounce text-primary" />
                <p className="font-display text-lg">Overgaan… {format(ringing)}</p>
                <p className="text-center text-xs text-muted-foreground">
                  Je betaalt niets zolang de lijn overgaat.
                </p>
              </div>
            )}

            <div className="flex justify-center gap-3">
              {answered ? (
                <Button variant="outline" size="lg" onClick={toggleMute}>
                  {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  {muted ? t("call.unmute") : t("call.mute")}
                </Button>
              ) : null}
              <Button variant="destructive" size="lg" onClick={hangUp}>
                <PhoneOff className="size-4" />
                {answered ? t("call.hangUp") : t("call.cancel")}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function UnavailableDialog({
  listener,
  available,
  onClose,
  onPick,
  waiting,
  onJoinWaitlist,
}: {
  listener: Listener | null;
  available: Listener[];
  onClose: () => void;
  onPick: (l: Listener) => void;
  /** True when the caller already asked to be alerted. */
  waiting?: boolean;
  onJoinWaitlist?: () => void;
}) {
  const { t } = useTranslation();
  const busyTitle = listener
    ? `${listener.displayName} is momenteel in gesprek`
    : t("call.unavailableTitle");

  return (
    <Dialog open={!!listener} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{busyTitle}</DialogTitle>
          <DialogDescription>{t("call.unavailableBody")}</DialogDescription>
        </DialogHeader>
        {available.length > 0 ? (
          <>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("call.quickConnect")}
            </p>
            <ul className="flex flex-col gap-2">
              {available.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => onPick(l)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3 text-left transition-colors hover:border-primary/50"
                  >
                    <img
                      src={l.avatar}
                      alt={l.displayName}
                      width={512}
                      height={512}
                      className="size-11 rounded-full object-cover"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{l.displayName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {l.language === "NL" ? "Nederlands" : "English"}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-success">
                      {t("listeners.online")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm">
            <p className="text-muted-foreground">
              Everyone is in a conversation right now. Join the waiting line and we'll alert you
              here the moment a listener is free.
            </p>
            <Button className="mt-3 w-full" disabled={waiting} onClick={() => onJoinWaitlist?.()}>
              <BellRing className="size-4" />
              {waiting ? "You're in the waiting line" : "Notify me when someone is free"}
            </Button>
          </div>
        )}
        <Button variant="ghost" onClick={onClose}>
          {t("call.cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
