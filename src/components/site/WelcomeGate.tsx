import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export const WELCOME_KEY = "at.welcome.v1";

export function welcomeAccepted(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(WELCOME_KEY) === "yes";
}

/** First-launch notice: 18+, supportive wellness space, not a dating app. */
export function WelcomeGate() {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setShow(!welcomeAccepted());
  }, []);

  if (!show) return null;

  const accept = () => {
    window.localStorage.setItem(WELCOME_KEY, "yes");
    window.dispatchEvent(new CustomEvent("at:welcome"));
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/80 p-3 backdrop-blur-sm sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="w-full max-w-md rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
        <HeartHandshake className="size-8 text-primary" aria-hidden />
        <h2 id="welcome-title" className="mt-3 font-display text-2xl font-semibold">Welcome to Anontalk</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A supportive place to talk things through and feel a bit lighter — anonymously.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>💛 This is a wellness community, <strong>not a dating app</strong>.</li>
          <li>🤝 Conversations are with peers, not professional advice.</li>
          <li>🆘 In a crisis, use the <strong>SOS</strong> button or a helpline right away.</li>
          <li>🔞 You must be <strong>18 or older</strong>.</li>
        </ul>
        <label className="mt-5 flex min-h-12 cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 size-5 accent-[var(--primary)]" />
          <span>I'm 18 or older and I agree to the <a href="/guidelines" className="text-primary underline">Community Guidelines</a> and <a href="/terms" className="text-primary underline">Terms</a>.</span>
        </label>
        <Button className="mt-4 min-h-12 w-full" disabled={!checked} onClick={accept}>Enter Anontalk</Button>
      </div>
    </div>
  );
}
