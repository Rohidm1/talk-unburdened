import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/consent";

/** GDPR cookie banner: statistics and ads stay off until the visitor accepts. */
export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(getConsent() === null);
  }, []);

  if (!show) return null;

  const choose = (c: "accepted" | "essential") => {
    setConsent(c);
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-text"
      className="fixed inset-x-3 bottom-[calc(var(--nav-offset)+0.75rem)] z-[70] mx-auto max-w-xl rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl md:bottom-4"
    >
      <h2 id="consent-title" className="flex items-center gap-2 font-semibold">
        <Cookie className="size-4 text-primary" aria-hidden /> Your privacy choice
      </h2>
      <p id="consent-text" className="mt-1 text-sm text-muted-foreground">
        We use essential storage to keep you signed in. With your OK we also use visit statistics and Google ads cookies.{" "}
        <a href="/cookies" className="text-primary underline underline-offset-4">Read more</a>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="min-h-12 flex-1" onClick={() => choose("accepted")}>Accept all</Button>
        <Button variant="outline" className="min-h-12 flex-1" onClick={() => choose("essential")}>Essential only</Button>
      </div>
    </div>
  );
}
