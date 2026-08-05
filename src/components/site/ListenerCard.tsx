import { useTranslation } from "react-i18next";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Listener } from "@/data/listeners";

const statusStyles: Record<Listener["status"], string> = {
  online: "bg-success/15 text-success",
  busy: "bg-destructive/15 text-destructive",
  offline: "bg-muted text-muted-foreground",
};

const dotStyles: Record<Listener["status"], string> = {
  online: "bg-success",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

export function ListenerCard({
  listener,
  onCall,
}: {
  listener: Listener;
  onCall: (l: Listener) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language ?? "en").startsWith("nl") ? "nl" : "en";

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] transition-colors hover:border-primary/40">
      <div className="relative">
        <img
          src={listener.avatar}
          alt={listener.displayName}
          loading="lazy"
          width={512}
          height={512}
          className="aspect-square w-full object-cover"
        />
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur ${statusStyles[listener.status]}`}
        >
          <span className={`size-1.5 rounded-full ${dotStyles[listener.status]}`} />
          {t(`listeners.${listener.status}`)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">{listener.displayName}</h3>
          <span className="text-xs text-muted-foreground">{listener.years} yrs</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{listener.bio[lang]}</p>

        <div className="flex flex-wrap gap-1.5">
          {listener.languages.map((l) => (
            <span
              key={l}
              className="rounded-md border border-primary/30 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-primary"
            >
              {l}
            </span>
          ))}
          {listener.topics.map((topic) => (
            <span
              key={topic.en}
              className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
            >
              {topic[lang]}
            </span>
          ))}
        </div>

        <Button className="mt-auto w-full" onClick={() => onCall(listener)}>
          <PhoneCall className="size-4" />
          {t("listeners.call")}
        </Button>
      </div>
    </article>
  );
}