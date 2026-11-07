import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
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
  onChat,
}: {
  listener: Listener;
  onChat: (l: Listener) => void;
}) {
  const { t } = useTranslation();
  const lang = "en" as const;
  const LANGUAGE_NAMES: Record<string, string> = {
    EN: "English",
    NL: "Dutch",
    DE: "German",
    EL: "Greek",
    ES: "Spanish",
    PT: "Portuguese",
    FR: "French",
    IT: "Italian",
    TR: "Turkish",
    PL: "Polish",
  };
  const languageLabel = listener.language
    .split("/")
    .map((code) => LANGUAGE_NAMES[code] ?? code)
    .join(", ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)] transition-colors hover:border-primary/40">
      <div className="relative p-3 pb-0">
        <img
          src={listener.avatar}
          alt={`${listener.displayName}, anonymous chat partner on Anontalk (${languageLabel})`}
          loading="lazy"
          width={816}
          height={816}
          className="aspect-square w-full rounded-2xl object-cover"
        />
        <span
          className={`absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur ${statusStyles[listener.status]}`}
        >
          <span className={`size-1.5 rounded-full ${dotStyles[listener.status]}`} />
          {t(`listeners.${listener.status}`)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-semibold">
            {listener.displayName}
            <span className="ml-2 text-sm font-normal text-muted-foreground">{listener.age}</span>
          </h3>
          <span className="rounded-md border border-primary/30 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-primary">
            <span className="sr-only">Languages spoken: </span>
            {languageLabel}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{listener.bio[lang]}</p>
        <p className="text-sm font-medium text-foreground">“{listener.cta}”</p>
        <p className="text-[11px] leading-snug text-muted-foreground/90">
          Persona run by the Anontalk team · AI-generated photo
        </p>

        <div className="flex flex-wrap gap-1.5">
          {listener.topics.map((topic) => (
            <span
              key={topic.en}
              className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
            >
              {topic[lang]}
            </span>
          ))}
        </div>

        <div className="mt-auto flex gap-2 pt-1">
          <Button className="flex-1" onClick={() => onChat(listener)}>
            <MessageCircle className="size-4" />
            Start chat
          </Button>
        </div>
      </div>
    </article>
  );
}
