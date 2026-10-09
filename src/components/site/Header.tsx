import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { href: "/#listeners", key: "nav.profiles" },
  { href: "/#how", key: "nav.how" },
  { href: "/#pricing", key: "nav.pricing" },
  { href: "/blog", key: "nav.blog" },
  { href: "/speed-chat", key: "nav.speed" },
  { href: "/community", key: "nav.community" },
  { href: "/bottles", key: "nav.bottles" },
  { href: "/dilemma", key: "nav.dilemma" },
  { href: "/wellness", key: "nav.wellness" },
  { href: "/#faq", key: "nav.faq" },
  { href: "/#contact", key: "nav.contact" },
];

export function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { session, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <a href="/#top" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessageCircle className="size-4" />
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
          {loading ? null : session ? (
            <Button size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/account">{t("nav.account")}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                <Link to="/auth">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" className="hidden sm:inline-flex" asChild>
                <Link to="/auth">{t("nav.signup")}</Link>
              </Button>
            </>
          )}
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
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
              {session ? (
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/account">{t("nav.account")}</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/auth">{t("nav.login")}</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to="/auth">{t("nav.signup")}</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
