import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BellRing, Mic, MicOff, PhoneOff } from "lucide-react";
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

export function ActiveCallDialog({
  listener,
  allowanceSeconds,
  mode,
  onTick,
  onEnd,
  call,
  audioLive,
}: {
  listener: Listener | null;
  allowanceSeconds: number;
  mode: "paid" | "free";
  /** Server heartbeat. Returns the authoritative remaining seconds. */
  onTick: () => Promise<{ remaining: number; shouldEnd: boolean } | null>;
  onEnd: () => void;
  call?: Call | null;
  audioLive?: boolean;
}) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [remaining, setRemaining] = useState(allowanceSeconds);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!listener) return;
    setElapsed(0);
    setMuted(false);
    setRemaining(allowanceSeconds);
    endedRef.current = false;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listener]);

  // The server decides when time is up; the local ticker is display only.
  useEffect(() => {
    if (!listener) return;
    let cancelled = false;

    const beat = async () => {
      const status = await onTick();
      if (cancelled || !status) return;
      setRemaining(status.remaining);
      if (status.shouldEnd && !endedRef.current) {
        endedRef.current = true;
        onEnd();
      }
    };

    void beat();
    const id = setInterval(() => void beat(), 10000);
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
    onEnd();
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
                className="size-24 rounded-full object-cover ring-2 ring-primary/50"
              />
              <DialogTitle className="mt-3 font-display text-xl">
                {t("call.inCall")} {listener.displayName}
              </DialogTitle>
              <DialogDescription>
                {audioLive ? t("call.liveAudio") : t("call.demo")}
              </DialogDescription>
            </DialogHeader>

            <div className="text-center font-display text-5xl tabular-nums">{format(elapsed)}</div>

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

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {mode === "free" ? "Free minutes left" : "Talk time left"}
                </p>
                <p className="font-display text-lg text-primary tabular-nums">{format(left)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">{t("call.balance")}</p>
                <p className="font-display text-lg tabular-nums">€ {cost.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" size="lg" onClick={toggleMute}>
                {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {muted ? t("call.unmute") : t("call.mute")}
              </Button>
              <Button variant="destructive" size="lg" onClick={hangUp}>
                <PhoneOff className="size-4" />
                {t("call.hangUp")}
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

  return (
    <Dialog open={!!listener} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t("call.unavailableTitle")}</DialogTitle>
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
                <span className="text-xs font-medium text-success">{t("listeners.online")}</span>
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
            <Button
              className="mt-3 w-full"
              disabled={waiting}
              onClick={() => onJoinWaitlist?.()}
            >
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
