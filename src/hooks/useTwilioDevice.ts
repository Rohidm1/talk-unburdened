import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { Call, Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "@/lib/voice.functions";

/**
 * Owns the Twilio Device. The device is created lazily and re-created on
 * demand, so dialling never fails just because the background warm-up was
 * still running (or had silently expired/errored).
 */
export function useTwilioDevice(enabled: boolean) {
  const fetchToken = useServerFn(getVoiceToken);
  // Kept in a ref so a new function identity on re-render can never tear the
  // device down mid-call (that used to drop the audio leg silently).
  const fetchTokenRef = useRef(fetchToken);
  fetchTokenRef.current = fetchToken;

  const deviceRef = useRef<Device | null>(null);
  const settingUpRef = useRef<Promise<Device | null> | null>(null);
  const mountedRef = useRef(true);

  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teardown = useCallback(() => {
    try {
      deviceRef.current?.destroy();
    } catch {
      /* already gone */
    }
    deviceRef.current = null;
    settingUpRef.current = null;
    if (mountedRef.current) setReady(false);
  }, []);

  const createDevice = useCallback(async (): Promise<Device | null> => {
    const res = await fetchTokenRef.current();
    if (!res?.token) throw new Error("voice-unconfigured");
    const { Device: TwilioDevice } = await import("@twilio/voice-sdk");
    const device = new TwilioDevice(res.token, {
      logLevel: "error",
      // Survive short network hiccups instead of dropping the leg.
      maxCallSignalingTimeoutMs: 30000,
    });
    device.on("incoming", (call: Call) => {
      setIncoming(call);
      call.on("disconnect", () => setIncoming(null));
      call.on("cancel", () => setIncoming(null));
      call.on("reject", () => setIncoming(null));
    });
    device.on("error", (err: { code?: number; message?: string }) => {
      console.error("[voice] device error", err);
      // Token problems (200xx) are recoverable: drop the device so the next
      // dial rebuilds it with a fresh token.
      if (err?.code && err.code >= 20100 && err.code <= 20200) teardown();
      if (mountedRef.current) setError(err?.message ?? "Audioverbinding mislukt");
    });
    device.on("tokenWillExpire", () => {
      void fetchTokenRef.current()
        .then((next) => next?.token && device.updateToken(next.token))
        .catch(() => teardown());
    });
    device.on("unregistered", () => {
      if (mountedRef.current) setReady(false);
    });
    deviceRef.current = device;
    if (mountedRef.current) {
      setIdentity(res.identity);
      setReady(true);
      setError(null);
    }
    // Conference calls are always started with device.connect(). Registering
    // is only required for Twilio's incoming-call signalling and can fail on
    // mobile/background browsers even though outbound audio works perfectly.
    // Do not block customer calls on that unrelated registration step.
    return device;
  }, [teardown]);

  /** Returns a registered device, building one (with one retry) if needed. */
  const ensureDevice = useCallback(async (): Promise<Device> => {
    if (deviceRef.current) return deviceRef.current;
    if (!settingUpRef.current) {
      settingUpRef.current = (async () => {
        try {
          return await createDevice();
        } catch (err) {
          console.error("[voice] device setup failed, retrying", err);
          // One automatic retry with a fresh token — covers expired tokens,
          // a cold network or a transient Twilio signalling hiccup.
          await new Promise((r) => setTimeout(r, 800));
          return await createDevice();
        } finally {
          settingUpRef.current = null;
        }
      })();
    }
    const device = await settingUpRef.current;
    if (!device) throw new Error("audio-device-not-ready");
    return device;
  }, [createDevice]);

  // Warm the device up in the background so the first dial is instant.
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    void ensureDevice().catch((err) => {
      console.error("[voice] warm-up failed", err);
      if (mountedRef.current) setError("De audioverbinding kon niet worden opgezet.");
    });
    return () => {
      mountedRef.current = false;
      teardown();
    };
  }, [enabled, ensureDevice, teardown]);

  const connect = useCallback(
    async (params: Record<string, string>) => {
      // Ask for the microphone before dialling; otherwise the leg joins muted
      // and both sides hear silence.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        throw new Error("microphone-denied");
      }

      const device = await ensureDevice();
      try {
        return await device.connect({ params });
      } catch (err) {
        // Stale device (token expired while idle, socket dropped): rebuild once.
        console.error("[voice] connect failed, rebuilding device", err);
        teardown();
        const fresh = await ensureDevice();
        return await fresh.connect({ params });
      }
    },
    [ensureDevice, teardown],
  );

  return { ready, identity, incoming, setIncoming, connect, error };
}
