import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#listeners", key: "nav.profiles" },
  { href: "#how", key: "nav.how" },
  { href: "#pricing", key: "nav.pricing" },
  { href: "#faq", key: "nav.faq" },
  { href: "#contact", key: "nav.contact" },
];

export function Header() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = i18n.language;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Phone className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Anontalk</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border p-0.5">
            {(["nl", "en"] as const).map((code) => (
              <button
                key={code}
                onClick={() => void i18n.changeLanguage(code)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                  lang === code
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            {t("nav.login")}
          </Button>
          <Button size="sm" className="hidden sm:inline-flex">
            {t("nav.signup")}
          </Button>
          <button
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border/60 px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground"
              >
                {t(l.key)}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                {t("nav.login")}
              </Button>
              <Button size="sm" className="flex-1">
                {t("nav.signup")}
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}