import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

/** "Reconnecting…" / "Back online" toasts plus a calm breathing screen when offline. */
export function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [showScreen, setShowScreen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      toast.loading("Reconnecting…", { id: "net" });
      timer.current = window.setTimeout(() => setShowScreen(true), 4000);
    };
    const goOnline = () => {
      setOffline(false);
      setShowScreen(false);
      window.clearTimeout(timer.current);
      toast.success("Back online", { id: "net", duration: 2000 });
    };
    if (!navigator.onLine) goOffline();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.clearTimeout(timer.current);
    };
  }, []);

  if (!offline || !showScreen) return null;

  return (
    <div role="alert" className="sos-sky fixed inset-0 z-[85] flex flex-col items-center justify-center px-6 text-center text-foreground">
      <WifiOff className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 font-display text-2xl font-semibold">You're offline</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">No rush. We'll reconnect as soon as your signal is back. Meanwhile, breathe with the circle.</p>
      <div className="breathe-loop mt-10 size-40 rounded-full bg-primary/25 shadow-[0_0_60px_var(--primary)]" aria-hidden />
      <p className="mt-8 text-xs text-muted-foreground">Your messages are safe — nothing is lost.</p>
      <button type="button" onClick={() => setShowScreen(false)} className="mt-6 min-h-12 rounded-full border border-border px-5 text-sm">Keep browsing</button>
    </div>
  );
}
