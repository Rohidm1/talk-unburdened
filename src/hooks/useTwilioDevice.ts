import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Call, Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "@/lib/voice.functions";

export function useTwilioDevice(enabled: boolean) {
  const fetchToken = useServerFn(getVoiceToken);
  // Kept in a ref so a new function identity on re-render can never tear the
  // device down mid-call (that used to drop the audio leg silently).
  const fetchTokenRef = useRef(fetchToken);
  fetchTokenRef.current = fetchToken;
  const deviceRef = useRef<Device | null>(null);
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let device: Device | null = null;

    void (async () => {
      try {
        const res = await fetchTokenRef.current();
        if (cancelled || !res.token) return;
        const { Device: TwilioDevice } = await import("@twilio/voice-sdk");
        device = new TwilioDevice(res.token, { logLevel: "error" });
        device.on("incoming", (call: Call) => {
          setIncoming(call);
          call.on("disconnect", () => setIncoming(null));
          call.on("cancel", () => setIncoming(null));
          call.on("reject", () => setIncoming(null));
        });
        device.on("error", (err: { message?: string }) => {
          console.error("[voice] device error", err);
          setError(err?.message ?? "Audioverbinding mislukt");
        });
        device.on("tokenWillExpire", () => {
          void fetchTokenRef.current()
            .then((next) => next.token && device?.updateToken(next.token))
            .catch(() => undefined);
        });
        await device.register();
        if (cancelled) {
          device.destroy();
          return;
        }
        deviceRef.current = device;
        setIdentity(res.identity);
        setReady(true);
        setError(null);
      } catch (err) {
        console.error("[voice] device setup failed", err);
        setError("De audioverbinding kon niet worden opgezet.");
      }
    })();

    return () => {
      cancelled = true;
      device?.destroy();
      deviceRef.current = null;
      setReady(false);
    };
  }, [enabled]);

  const connect = useCallback(
    async (params: Record<string, string>) => {
      const device = deviceRef.current;
      if (!device) throw new Error("audio-device-not-ready");
      // Ask for the microphone before dialling; otherwise the leg joins muted
      // and both sides hear silence.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        throw new Error("microphone-denied");
      }
      return device.connect({ params });
    },
    [],
  );

  return { ready, identity, incoming, setIncoming, connect, error };
}