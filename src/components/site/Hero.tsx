import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

export function Hero({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();

  const badges = [
    { icon: Lock, label: t("hero.badgeAnon") },
    { icon: CreditCard, label: t("hero.badgeCard") },
    { icon: ShieldCheck, label: t("hero.badgeCall") },
  ];

  return (
    <section id="top" className="relative overflow-hidden">
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1080}
        className="absolute inset-0 size-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-[var(--gradient-night)] opacity-80" />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-24 md:py-36">
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
            <Button size="lg" onClick={onStart} className="shadow-[var(--shadow-glow)]">
              {t("hero.cta")}
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
        </motion.div>
      </div>
    </section>
  );
}