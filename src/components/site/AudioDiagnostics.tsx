import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, Mic, Volume2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Check = "idle" | "testing" | "ok" | "failed";

function Row({
  icon,
  label,
  state,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  state: Check;
  detail?: string | undefined;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">
          {state === "testing" ? "Bezig met testen…" : (detail ?? "Nog niet getest")}
        </span>
      </span>
      {state === "ok" ? <CheckCircle2 className="size-5 text-success" /> : null}
      {state === "failed" ? <XCircle className="size-5 text-destructive" /> : null}
    </li>
  );
}

/**
 * Quick self-test the agent can run while the line is connecting or after a
 * failure: is there a microphone, does output work, and how healthy is the link.
 */
export function AudioDiagnostics({
  open,
  onOpenChange,
  statusLine,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusLine?: string | undefined;
  onRetry?: (() => void) | undefined;
}) {
  const [mic, setMic] = useState<Check>("idle");
  const [micDetail, setMicDetail] = useState<string>();
  const [speaker, setSpeaker] = useState<Check>("idle");
  const [speakerDetail, setSpeakerDetail] = useState<string>();
  const [net, setNet] = useState<Check>("idle");
  const [netDetail, setNetDetail] = useState<string>();

  const testMic = useCallback(async () => {
    setMic("testing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let peak = 0;
      const started = Date.now();
      await new Promise<void>((resolve) => {
        const id = setInterval(() => {
          analyser.getByteTimeDomainData(buffer);
          for (const v of buffer) peak = Math.max(peak, Math.abs(v - 128));
          if (Date.now() - started > 1500) {
            clearInterval(id);
            resolve();
          }
        }, 100);
      });
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      setMic("ok");
      setMicDetail(
        peak > 2
          ? `Audio-input gecontroleerd — geluid gedetecteerd (niveau ${Math.round((peak / 128) * 100)}%)`
          : "Microfoon beschikbaar, maar er kwam nauwelijks geluid binnen. Spreek even.",
      );
    } catch {
      setMic("failed");
      setMicDetail("Geen toegang tot de microfoon. Sta toegang toe in je browser.");
    }
  }, []);

  const testSpeaker = useCallback(() => {
    setSpeaker("testing");
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
      window.setTimeout(() => {
        setSpeaker("ok");
        setSpeakerDetail("Testtoon afgespeeld. Hoorde je een piep? Dan werkt je uitvoer.");
        void ctx.close();
      }, 900);
    } catch {
      setSpeaker("failed");
      setSpeakerDetail("De testtoon kon niet worden afgespeeld.");
    }
  }, []);

  const testNetwork = useCallback(async () => {
    setNet("testing");
    const samples: number[] = [];
    try {
      for (let i = 0; i < 3; i++) {
        const started = performance.now();
        await fetch(`/favicon.ico?ping=${Date.now()}-${i}`, { cache: "no-store" });
        samples.push(performance.now() - started);
      }
      const latency = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      setNet(latency < 400 ? "ok" : "failed");
      setNetDetail(
        latency < 150
          ? `Uitstekende verbinding (${latency} ms)`
          : latency < 400
            ? `Verbinding in orde (${latency} ms)`
            : `Trage verbinding (${latency} ms) — audio kan haperen`,
      );
    } catch {
      setNet("failed");
      setNetDetail("Geen netwerkverbinding gedetecteerd.");
    }
  }, []);

  const runAll = useCallback(() => {
    void testMic();
    testSpeaker();
    void testNetwork();
  }, [testMic, testSpeaker, testNetwork]);

  useEffect(() => {
    if (open) runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Audio-diagnose</DialogTitle>
          <DialogDescription>
            {statusLine ?? "We controleren je microfoon, geluid en verbinding."}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          <Row icon={<Mic className="size-4" />} label="Microfoon" state={mic} detail={micDetail} />
          <Row
            icon={<Volume2 className="size-4" />}
            label="Luidspreker"
            state={speaker}
            detail={speakerDetail}
          />
          <Row
            icon={<Activity className="size-4" />}
            label="Netwerk / latency"
            state={net}
            detail={netDetail}
          />
        </ul>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={runAll}>
            Opnieuw testen
          </Button>
          <Button onClick={() => onRetry?.()} disabled={!onRetry}>
            Opnieuw verbinden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}