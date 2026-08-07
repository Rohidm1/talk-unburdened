import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, MessageCircle, MessageSquareHeart, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { creditPackages } from "@/data/listeners";
import { RATE_PER_MINUTE } from "@/lib/credit-packages";
import { BillingDescriptorNotice } from "@/components/site/BillingDescriptorNotice";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import type { CreditPackageKey } from "@/lib/credit-packages";
import { CreditCheckoutDialog } from "@/components/site/CreditCheckoutDialog";

export function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { icon: UserRound, title: t("how.s1t"), body: t("how.s1d") },
    { icon: MessageSquareHeart, title: t("how.s2t"), body: t("how.s2d") },
    { icon: Volume2, title: t("how.s3t"), body: t("how.s3d") },
  ];

  return (
    <section id="how" className="mx-auto w-full max-w-6xl px-5 py-20">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
        {t("how.title")}
      </h2>
      <p className="mt-3 max-w-xl text-muted-foreground">{t("how.subtitle")}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-3xl border border-border bg-card p-6">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <s.icon className="size-5" />
            </div>
            <p className="mt-5 text-xs font-semibold tracking-widest text-muted-foreground">
              0{i + 1}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Pricing() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [checkoutKey, setCheckoutKey] = useState<CreditPackageKey | null>(null);

  const startCheckout = (key: CreditPackageKey) => {
    if (!session) {
      toast.info(t("pricing.loginFirst"));
      void navigate({ to: "/auth" });
      return;
    }
    setCheckoutKey(key);
  };

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-5 py-20">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
        {t("pricing.title")}
      </h2>
      <p className="mt-3 max-w-xl text-muted-foreground">{t("pricing.subtitle")}</p>

      <div className="mt-10 grid gap-5 lg:grid-cols-4">
        <div className="rounded-3xl border border-border bg-secondary/30 p-6">
          <h3 className="font-display text-lg font-semibold">{t("pricing.payg")}</h3>
          <p className="mt-4 font-display text-4xl font-semibold">
            € {RATE_PER_MINUTE.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-sm text-muted-foreground">{t("pricing.perMin")}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {t("pricing.paygDesc")}
          </p>
        </div>

        {creditPackages.map((p) => {
          const perMin = p.priceEur / p.minutes;
          const save = Math.round((1 - perMin / RATE_PER_MINUTE) * 100);
          return (
            <div
              key={p.id}
              className={`relative rounded-3xl border bg-card p-6 ${
                p.popular ? "border-primary shadow-[var(--shadow-glow)]" : "border-border"
              }`}
            >
              {p.popular ? (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                  {t("pricing.popular")}
                </span>
              ) : null}
              <h3 className="font-display text-lg font-semibold">
                {t(`pricing.packages.${p.key}`)}
              </h3>
              <p className="mt-4 font-display text-4xl font-semibold">€ {p.priceEur}</p>
              <p className="text-sm text-muted-foreground">
                {p.minutes} {t("pricing.minutes")}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />€{" "}
                  {perMin.toFixed(2).replace(".", ",")} {t("pricing.perMin")}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  {t("pricing.save")} {save}%
                </li>
              </ul>
              <Button
                className="mt-6 w-full"
                variant={p.popular ? "default" : "outline"}
                onClick={() => startCheckout(p.key)}
              >
                {t("pricing.buy")}
              </Button>
            </div>
          );
        })}
      </div>

      <CreditCheckoutDialog packageKey={checkoutKey} onClose={() => setCheckoutKey(null)} />
      <BillingDescriptorNotice className="mx-auto mt-6 max-w-xl justify-center text-center" />
    </section>
  );
}

export function Faq() {
  const { t } = useTranslation();
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-5 py-20">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
        {t("faq.title")}
      </h2>
      <Accordion type="single" collapsible className="mt-8">
        {items.map((i) => (
          <AccordionItem key={i} value={`q${i}`}>
            <AccordionTrigger className="text-left font-display text-base">
              {t(`faq.q${i}`)}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {t(`faq.a${i}`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function ContactSection() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", subject: "", message: "" });

  return (
    <section id="contact" className="mx-auto w-full max-w-3xl px-5 py-20">
      <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
        {t("contact.title")}
      </h2>
      <p className="mt-3 text-muted-foreground">{t("contact.subtitle")}</p>
      <form
        className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          toast.success(t("contact.sent"));
          setForm({ email: "", subject: "", message: "" });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="email">{t("contact.email")}</Label>
          <Input
            id="email"
            type="email"
            required
            maxLength={255}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subject">{t("contact.subject")}</Label>
          <Input
            id="subject"
            required
            maxLength={120}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="message">{t("contact.message")}</Label>
          <Textarea
            id="message"
            required
            rows={5}
            maxLength={1000}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <Button type="submit" size="lg">
          {t("contact.send")}
        </Button>
      </form>
    </section>
  );
}

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-12">
        <p className="font-display text-lg font-semibold">Anontalk</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("footer.tagline")}</p>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          {t("footer.disclaimer")}
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Anontalk. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}