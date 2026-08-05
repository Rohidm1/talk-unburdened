import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import type { Call } from "@twilio/voice-sdk";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RATE_PER_MINUTE, type Listener } from "@/data/listeners";

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(seconds % 60, 0);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActiveCallDialog({
  listener,
  balanceSeconds,
  onEnd,
  call,
  audioLive,
}: {
  listener: Listener | null;
  balanceSeconds: number;
  onEnd: (elapsed: number) => void;
  call?: Call | null;
  audioLive?: boolean;
}) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!listener) return;
    setElapsed(0);
    setMuted(false);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [listener]);

  useEffect(() => {
    if (listener && elapsed >= balanceSeconds && balanceSeconds > 0) onEnd(elapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const left = Math.max(balanceSeconds - elapsed, 0);
  const cost = (elapsed / 60) * RATE_PER_MINUTE;

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      call?.mute(next);
      return next;
    });
  };

  const hangUp = () => {
    call?.disconnect();
    onEnd(elapsed);
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

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">{t("call.freeLeft")}</p>
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
}: {
  listener: Listener | null;
  available: Listener[];
  onClose: () => void;
  onPick: (l: Listener) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!listener} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t("call.unavailableTitle")}</DialogTitle>
          <DialogDescription>{t("call.unavailableBody")}</DialogDescription>
        </DialogHeader>
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
                    {l.languages.join(" · ")}
                  </span>
                </span>
                <span className="text-xs font-medium text-success">{t("listeners.online")}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" onClick={onClose}>
          {t("call.cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
