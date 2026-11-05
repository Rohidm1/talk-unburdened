import { createFileRoute } from "@tanstack/react-router";
import "@/lib/i18n";
import { LegalPage } from "@/components/site/LegalPage";
import { breadcrumbSchema, jsonLd, pageHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    ...pageHead({
      title: "Cookie & Data Statement | Anontalk",
      description: "What Anontalk stores in your browser, which statistics and ad cookies need consent, and how to change your choice.",
      path: "/cookies",
    }),
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Cookie & Data Statement", path: "/cookies" }]))],
  }),
  component: CookiesPage,
});

const rows = [
  ["Essential", "Sign-in session, your cookie choice, sound on/off, daily check-in progress, last-seen markers for notification badges.", "Always on — needed for the site to work."],
  ["Statistics", "First-party visit statistics: page path, referrer, country and a random visitor ID.", "Only with consent."],
  ["Advertising", "Google AdSense cookies and related ad data, plus Google Ads measurement: whether a visitor who came from one of our ads went on to create and verify an account (an account ID is sent to Google so it is counted once).", "Only with consent."],
  ["Translation", "Weglot page translation and your language preference.", "Used only for translation."],
] as const;

function CookiesPage() {
  const { t } = useTranslation();
  return (
    <LegalPage
      title="Cookie & Data Statement"
      summary="Anontalk only stores what it needs to keep you signed in and remember your settings. Visit statistics and Google AdSense cookies are used only if you accept them. You can change your choice at any time with the button below."
      sections={[
        {
          id: "storage",
          title: "What is stored",
          content: (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="p-4 text-left font-semibold text-foreground">Browser storage by purpose</caption>
                <thead className="bg-card text-foreground">
                  <tr><th scope="col" className="p-3">Category</th><th scope="col" className="p-3">What</th><th scope="col" className="p-3">Choice</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(([c, w, ch]) => (
                    <tr key={c}><th scope="row" className="p-3 font-medium">{c}</th><td className="p-3">{w}</td><td className="p-3">{ch}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: "choices",
          title: "Change your choice",
          content: (
            <>
              <p>{t("consent.settings")}</p>
              <p>{t("consent.evidence")}</p>
              <Button
                type="button"
                className="min-h-12"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("at:cookie-settings"));
                }}
              >
                {t("consent.change")}
              </Button>
            </>
          ),
        },
        {
          id: "details",
          title: "More information",
          content: (
            <>
              <p>Read our <a href="/privacy">Privacy Policy</a> for providers, retention and your rights. Questions? Use our <a href="/#contact">contact form</a>.</p>
              <p>How Google uses data from sites that use its services: <a href="https://business.safety.google/privacy/" target="_blank" rel="noopener noreferrer">business.safety.google/privacy</a>.</p>
            </>
          ),
        },
      ]}
    />
  );
}
