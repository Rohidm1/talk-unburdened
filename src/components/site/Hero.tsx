import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { ArrowRight, CreditCard, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import heroBgWebp from "@/assets/hero-bg.webp";

export function Hero({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();

  const badges = [
    { icon: Lock, label: t("hero.badgeAnon") },
    { icon: CreditCard, label: t("hero.badgeCard") },
    { icon: ShieldCheck, label: t("hero.badgeCall") },
  ];

  const stats = [
    { value: "5", label: t("hero.statPeople") },
    { value: "24/7", label: t("hero.statWait") },
    { value: "0", label: t("hero.statPrivate") },
  ];

  return (
    <section id="top" className="relative overflow-hidden">
      <picture>
        <source srcSet={heroBgWebp} type="image/webp" />
        <img
          src={heroBg}
          alt="Calm midnight-blue night sky backdrop for Anontalk's anonymous live chat platform"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover opacity-60"
        />
      </picture>
      <div className="absolute inset-0 bg-[var(--gradient-night)] opacity-80" />
      <div
        aria-hidden="true"
        className="float-slow absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 py-24 md:py-32 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
            {t("hero.eyebrow")}
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onStart} className="glow-cta group">
              {t("hero.cta")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how">{t("hero.secondary")}</a>
            </Button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {badges.map((b) => (
              <li key={b.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <b.icon className="size-4 text-primary" />
                {b.label}
              </li>
            ))}
          </ul>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/70 bg-card/60 p-4">
                <dt className="font-display text-xl font-semibold tabular-nums">{s.value}</dt>
                <dd className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="hidden rounded-3xl border border-border/70 bg-card/80 p-5 backdrop-blur-xl lg:block"
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MessageCircle className="size-4" />
            </span>
            <span className="text-sm font-semibold">Anonymous chat</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" /> live
            </span>
          </div>
          <div className="space-y-3 pt-4 text-sm">
            <p className="max-w-[85%] rounded-2xl bg-secondary/60 px-3 py-2">
              Rough week. I don't really know where to start.
            </p>
            <p className="ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground">
              Start anywhere. I've got time, and nobody here knows who you are.
            </p>
            <p className="max-w-[85%] rounded-2xl bg-secondary/60 px-3 py-2">
              Okay. It's about work, mostly…
            </p>
            <p className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
              <span className="size-1.5 animate-bounce rounded-full bg-primary" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
              typing…
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
