import { en, type TranslationDictionary } from "./en";

/**
 * Registered languages. English is the default and the only active language.
 * Planned: Dutch ("nl") and Greek ("el") — add `nl.ts` / `el.ts` typed as
 * `TranslationDictionary` and list them here to enable them.
 */
export const LOCALES = {
  en,
} satisfies Record<string, TranslationDictionary>;

export type LocaleCode = keyof typeof LOCALES;
export const DEFAULT_LOCALE: LocaleCode = "en";
export const PLANNED_LOCALES = ["nl", "el"] as const;
