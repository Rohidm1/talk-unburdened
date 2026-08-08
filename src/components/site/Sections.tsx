import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Check,
  EyeOff,
  Heart,
  LogOut,
  MessageCircle,
  MessageSquareHeart,
  Quote,
  Receipt,
  Sparkles,
  UserRound,
} from "lucide-react";
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
import { BillingDescriptorNotice } from "@/components/site/BillingDescriptorNotice";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import type { CreditPackageKey } from "@/lib/credit-packages";
import { CreditCheckoutDialog } from "@/components/site/CreditCheckoutDialog";
import { Reveal } from "@/components/site/Reveal";

export function TrustStrip() {
  const { t } = useTranslation();
  const items = [
    { icon: EyeOff, title: t("trust.p1t"), body: t("trust.p1d") },
    { icon: Receipt, title: t("trust.p2t"), body: t("trust.p2d") },
    { icon: Heart, title: t("trust.p3t"), body: t("trust.p3d") },
    { icon: LogOut, title: t("trust.p4t"), body: t("trust.p4d") },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <Reveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {t("trust.title")}
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={0.05 * i}>
            <div className="card-lift h-full rounded-3xl border border-border bg-card p-6">
              <item.icon className="size-5 text-primary" />
              <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Voices() {
  const { t } = useTranslation();
  const quotes = [
    { quote: t("voices.q1"), author: t("voices.a1") },
    { quote: t("voices.q2"), author: t("voices.a2") },
    { quote: t("voices.q3"), author: t("voices.a3") },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <Reveal>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {t("voices.title")}
        </h2>
        <p className="mt-3 text-muted-foreground">{t("voices.subtitle")}</p>
      </Reveal>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {quotes.map((q, i) => (
          <Reveal key={q.author} delay={0.06 * i}>
            <figure className="card-lift h-full rounded-3xl border border-border bg-card p-6">
              <Quote className="size-5 text-primary" />
              <blockquote className="mt-4 text-sm leading-relaxed">“{q.quote}”</blockquote>
              <figcaption className="mt-4 text-xs text-muted-foreground">{q.author}</figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { icon: UserRound, title: t("how.s1t"), body: t("how.s1d") },
    { icon: MessageSquareHeart, title: t("how.s2t"), body: t("how.s2d") },
    { icon: MessageCircle, title: t("how.s3t"), body: t("how.s3d") },
  ];

  return (
    <section id="how" className="mx-auto w-full max-w-6xl px-5 py-20">
      <Reveal>
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {t("how.title")}
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("how.subtitle")}</p>
      </Reveal>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={0.07 * i}>
          <div className="card-lift h-full rounded-3xl border border-border bg-card p-6">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <s.icon className="size-5" />
            </div>
            <p className="mt-5 text-xs font-semibold tracking-widest text-muted-foreground">
              0{i + 1}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function ChatIntro() {
  const { t } = useTranslation();
  const points = [t("chatIntro.point1"), t("chatIntro.point2"), t("chatIntro.point3")];

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-4">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <MessageCircle className="size-5" />
          </div>
          <h2 className="font-display text-xl font-semibold">{t("chatIntro.title")}</h2>
        </div>
        <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {p}
            </li>
          ))}
        </ul>
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
        {creditPackages.map((p) => {
          const perCredit = p.priceEur / p.credits;
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
              <h3 className="font-display text-lg font-semibold">{t(`pricing.packages.${p.key}`)}</h3>
              <p className="mt-4 font-display text-4xl font-semibold">
                ${p.priceEur.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {p.credits} {t("pricing.credits")}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  ${perCredit.toFixed(2)} {t("pricing.perCredit")}
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
            maxLength={2000}
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <Button type="submit" className="justify-self-start">
          {t("contact.send")}
        </Button>
      </form>
    </section>
  );
}

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-muted-foreground md:flex-row">
        <p>{t("footer.brand")}</p>
        <p>{t("footer.note")}</p>
      </div>
    </footer>
  );
}
