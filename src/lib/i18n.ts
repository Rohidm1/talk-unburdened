import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, LOCALES } from "@/locales";


if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: Object.fromEntries(Object.entries(LOCALES).map(([code, dict]) => [code, { translation: dict }])),
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: Object.keys(LOCALES),
    interpolation: { escapeValue: false },
  });
} else {
  // Keep a long-lived (server) instance in sync when dictionaries change.
  for (const [code, dict] of Object.entries(LOCALES)) i18n.addResourceBundle(code, "translation", dict, true, true);
}

export default i18n;
