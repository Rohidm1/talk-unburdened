import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConsent, getConsentRecord, setConsent } from "@/lib/consent";
import { welcomeAccepted } from "@/components/site/WelcomeGate";
import { useTranslation } from "react-i18next";

/** GDPR cookie banner: statistics and ads stay off until the visitor accepts. */
export function ConsentBanner() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => setShow((getConsent() === null || !getConsentRecord()) && welcomeAccepted());
    const open = () => setShow(true);
    sync();
    window.addEventListener("at:welcome", sync);
    window.addEventListener("at:consent", sync);
    window.addEventListener("at:cookie-settings", open);
    return () => {
      window.removeEventListener("at:welcome", sync);
      window.removeEventListener("at:consent", sync);
      window.removeEventListener("at:cookie-settings", open);
    };
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
      className="fixed inset-x-3 bottom-[calc(var(--nav-offset)+3rem)] z-[70] mx-auto max-w-xl rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl md:bottom-4"
    >
      <h2 id="consent-title" className="flex items-center gap-2 font-semibold">
        <Cookie className="size-4 text-primary" aria-hidden /> {t("consent.title")}
        {getConsent() !== null && <Button variant="ghost" size="icon" className="ml-auto" aria-label={t("consent.close")} title={t("consent.close")} onClick={() => setShow(false)}><X className="size-4" /></Button>}
      </h2>
      <p id="consent-text" className="mt-1 text-sm text-muted-foreground">
        {t("consent.text")}{" "}
        <a href="/cookies" className="text-primary underline underline-offset-4">{t("consent.more")}</a>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="min-h-12 flex-1" onClick={() => choose("accepted")}>{t("consent.accept")}</Button>
        <Button variant="outline" className="min-h-12 flex-1" onClick={() => choose("essential")}>{t("consent.reject")}</Button>
      </div>
    </div>
  );
}
