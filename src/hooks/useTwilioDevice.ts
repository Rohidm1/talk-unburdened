import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Call, Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "@/lib/voice.functions";

export function useTwilioDevice(enabled: boolean) {
  const fetchToken = useServerFn(getVoiceToken);
  const deviceRef = useRef<Device | null>(null);
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<Call | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let device: Device | null = null;

    void (async () => {
      try {
        const res = await fetchToken();
        if (cancelled || !res.token) return;
        const { Device: TwilioDevice } = await import("@twilio/voice-sdk");
        device = new TwilioDevice(res.token, { logLevel: "error" });
        device.on("incoming", (call: Call) => {
          setIncoming(call);
          call.on("disconnect", () => setIncoming(null));
          call.on("cancel", () => setIncoming(null));
          call.on("reject", () => setIncoming(null));
        });
        await device.register();
        if (cancelled) {
          device.destroy();
          return;
        }
        deviceRef.current = device;
        setIdentity(res.identity);
        setReady(true);
      } catch (err) {
        console.error("[voice] device setup failed", err);
      }
    })();

    return () => {
      cancelled = true;
      device?.destroy();
      deviceRef.current = null;
      setReady(false);
    };
  }, [enabled, fetchToken]);

  const connect = useCallback(
    async (params: Record<string, string>) => {
      const device = deviceRef.current;
      if (!device) return null;
      return device.connect({ params });
    },
    [],
  );

  return { ready, identity, incoming, setIncoming, connect };
}