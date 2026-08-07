import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Call } from "@twilio/voice-sdk";
import { CheckCircle2, Copy, Loader2, PhoneCall, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prepareSelfTest } from "@/lib/voice.functions";

type Result = {
  ok: boolean;
  title: string;
  detail: string;
  /** Correlation id + timeline + stack, for reporting to the admin. */
  diagnostics: string;
} | null;

/** Turns a raw failure into something an agent can act on. */
function explain(reason: string, credentialsOk: boolean | null): { title: string; detail: string } {
  if (credentialsOk === false) {
    return {
      title: "Belservice niet geconfigureerd",
      detail:
        "De telefoniegegevens ontbreken op de server. Meld dit bij de beheerder — dit kun je zelf niet oplossen.",
    };
  }
  if (reason === "microphone-denied")
    return {
      title: "Microfoon geblokkeerd",
      detail: "Sta microfoontoegang toe via het slotje in de adresbalk en test opnieuw.",
    };
  if (reason === "microphone-missing")
    return {
      title: "Geen microfoon gevonden",
      detail: "Sluit een headset of microfoon aan en test opnieuw.",
    };
  if (reason === "voice-unconfigured")
    return {
      title: "Belservice niet geconfigureerd",
      detail: "De server kon geen belsleutel afgeven. Meld dit bij de beheerder.",
    };
  if (reason === "token-request-failed")
    return {
      title: "Geen verbinding met de belservice",
      detail: "De aanvraag naar de server mislukte. Controleer je internetverbinding en test opnieuw.",
    };
  if (reason === "no-answer")
    return {
      title: "Geen antwoord van de belservice",
      detail:
        "De verbinding is opgezet maar er kwam geen audio terug binnen 15 seconden. Vaak blokkeert een firewall of VPN het spraakverkeer (UDP). Probeer een ander netwerk.",
    };
  if (reason === "rejected")
    return {
      title: "Testoproep geweigerd",
      detail:
        "Twilio wees de oproep af. Waarschijnlijk wijst de TwiML-app niet naar deze website. Meld dit bij de beheerder.",
    };
  if (reason.startsWith("voice-connect-failed")) {
    const code = reason.split(":")[1];
    return {
      title: "Audioverbinding mislukt",
      detail: code
        ? `Twilio-foutcode ${code}. Geef deze code door aan de beheerder als het blijft gebeuren.`
        : "De verbinding met Twilio kwam niet tot stand. Test opnieuw of probeer een ander netwerk.",
    };
  }
  if (reason.startsWith("call-error")) {
    const code = reason.split(":")[1];
    return {
      title: "Gesprek afgebroken",
      detail: `De testoproep werd afgebroken${code ? ` (foutcode ${code})` : ""}. Test opnieuw.`,
    };
  }
  return {
    title: "Test mislukt",
    detail: `Onbekende fout: ${reason}. Test opnieuw of meld dit bij de beheerder.`,
  };
}

/**
 * Self-serve check for agents: places a real (but free) diagnostic call to
 * Twilio, and names the exact reason when it cannot connect.
 */
export function VoiceSelfTest({
  connect,
}: {
  connect: (params: Record<string, string>) => Promise<Call>;
}) {
  const prepare = useServerFn(prepareSelfTest);
  const [state, setState] = useState<"idle" | "running">("idle");
  const [step, setStep] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [showDetails, setShowDetails] = useState(false);
  const callRef = useRef<Call | null>(null);

  const run = useCallback(async () => {
    setState("running");
    setResult(null);
    setShowDetails(false);
    let credentialsOk: boolean | null = null;
    const testId = `vst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const timeline: string[] = [];
    const ids: Record<string, string> = { testId };
    const mark = (label: string) => {
      timeline.push(`+${String(Date.now() - startedAt).padStart(5, " ")}ms  ${label}`);
      setStep(label);
    };
    const report = (stack?: string) =>
      [
        `testId: ${testId}`,
        `time: ${new Date(startedAt).toISOString()}`,
        `url: ${typeof window !== "undefined" ? window.location.origin : "?"}`,
        `ua: ${typeof navigator !== "undefined" ? navigator.userAgent : "?"}`,
        ...Object.entries(ids)
          .filter(([k]) => k !== "testId")
          .map(([k, v]) => `${k}: ${v}`),
        "",
        "timeline:",
        ...timeline,
        ...(stack ? ["", "stack:", stack] : []),
      ].join("\n");

    try {
      mark("Belservice controleren…");
      try {
        const res = await fetch("/api/public/twilio/health", { cache: "no-store" });
        const body = (await res.json()) as { configured?: boolean; requestId?: string };
        credentialsOk = !!body.configured;
        ids["healthStatus"] = String(res.status);
        ids["healthConfigured"] = String(credentialsOk);
        const requestId = res.headers.get("cf-ray") ?? body.requestId;
        if (requestId) ids["healthRequestId"] = requestId;
      } catch {
        credentialsOk = null; // health endpoint unreachable; keep going
        ids["healthStatus"] = "unreachable";
      }

      mark("Testoproep aanvragen…");
      const prep = await prepare();
      if (!prep.ready || !prep.testAuth) throw new Error(prep.reason ?? "voice-unconfigured");

      mark("Verbinden met Twilio…");
      const call = await connect({
        Mode: "selftest",
        Identity: "",
        DialAuth: prep.testAuth,
      });
      callRef.current = call;
      const sid = call.parameters?.["CallSid"];
      if (sid) ids["callSid"] = sid;

      mark("Wachten op audio…");
      const outcome = await new Promise<string>((resolve) => {
        const timer = window.setTimeout(() => resolve("no-answer"), 15000);
        const done = (value: string) => {
          window.clearTimeout(timer);
          timeline.push(`+${String(Date.now() - startedAt).padStart(5, " ")}ms  event: ${value}`);
          resolve(value);
        };
        call.on("accept", () => done("ok"));
        call.on("reject", () => done("rejected"));
        call.on("cancel", () => done("rejected"));
        call.on("error", (err: { code?: number }) =>
          done(`call-error:${err?.code ?? "onbekend"}`),
        );
        call.on("disconnect", () => done("ok"));
      });

      const liveSid = call.parameters?.["CallSid"];
      if (liveSid) ids["callSid"] = liveSid;
      if (outcome !== "ok") throw new Error(outcome);

      setResult({
        ok: true,
        title: "Audio werkt",
        detail:
          "De testverbinding kwam tot stand en je hoort het testbericht. Je kunt gesprekken aannemen.",
        diagnostics: report(),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      const stack = err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : String(err);
      const cause = (err as { cause?: unknown })?.cause;
      const causeText =
        cause instanceof Error ? `\ncaused by: ${cause.stack ?? cause.message}` : "";
      console.error("[voice] self-test failed", reason, err);
      setResult({
        ok: false,
        ...explain(reason, credentialsOk),
        diagnostics: report(`${stack}${causeText}`),
      });
    } finally {
      try {
        callRef.current?.disconnect();
      } catch {
        /* already gone */
      }
      callRef.current = null;
      setStep("");
      setState("idle");
    }
  }, [connect, prepare]);

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm">Test je belverbinding</p>
          <p className="text-xs text-muted-foreground">
            Korte testoproep naar de belservice. Kost geen credits en belt niemand.
          </p>
        </div>
        <Button variant="outline" onClick={() => void run()} disabled={state === "running"}>
          {state === "running" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PhoneCall className="size-4" />
          )}
          {state === "running" ? (step || "Bezig…") : "Test voice call"}
        </Button>
      </div>

      {result ? (
        <div
          className={`mt-3 flex gap-2 rounded-xl border p-3 text-xs ${
            result.ok
              ? "border-success/40 bg-success/10 text-success"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            <span className="block font-semibold">{result.title}</span>
            <span className="block text-foreground/80">{result.detail}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}