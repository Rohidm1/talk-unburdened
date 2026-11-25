import { createFileRoute } from "@tanstack/react-router";
import "@/lib/i18n";
import { en } from "@/locales/en";
import { LegalPage } from "@/components/site/LegalPage";
import { breadcrumbSchema, jsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    ...pageHead({
      title: "Terms of Service | Anontalk",
      description: "Anontalk terms: who can join, accounts, how credits work, acceptable use and your consumer rights.",
      path: "/terms",
    }),
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Terms of Service", path: "/terms" }]))],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="Anontalk is an 18+ peer conversation service run by Open Ear Collective, not professional advice or an emergency service. You get 5 free welcome credits, and every message you send costs 1 credit; partner replies are free. Be respectful, and know that chat partners use profile personas run by our team."
      sections={[
        {
          id: "service",
          title: "Who can use Anontalk",
          content: (
            <>
              <p>These terms govern your use of Anontalk, operated by Open Ear Collective. You must be at least 18. By using the service you agree to these terms and our <a href="/guidelines">Community Guidelines</a>.</p>
              <p>Conversations are with peers and are not professional advice. Anontalk is not an emergency service. In a crisis or immediate danger, call 112 or your local emergency number.</p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "Accounts and who you talk to",
          content: (
            <>
              <p>Use a verified email address and keep one account per person. A nickname is enough; no real name is needed. Keep your sign-in details safe.</p>
              <p>{en.chat.aiTerms}</p>
            </>
          ),
        },
        {
          id: "credits",
          title: "Credits, purchases and refunds",
          content: (
            <>
              <p>New accounts receive 5 free welcome credits. One credit is used for each message you send: in 1-on-1 chat, Speed Chat, community posts and replies, dropping a bottle, opening a bottle and replying to a bottle. Partner replies are free.</p>
              <p>Credits can be bought through the web checkout (Stripe) or, in the Android app, through Google Play. Bonus credits in a bundle are added together with the paid credits.</p>
              <p>Used credits cannot be refunded, except where the law requires otherwise. Refunds or chargebacks may put your account on hold while we review it. Nothing in these terms limits your statutory consumer rights.</p>
            </>
          ),
        },
        {
          id: "conduct",
          title: "Acceptable use",
          content: <p>Follow our <a href="/guidelines">Community Guidelines</a>. Do not harass, threaten, dox, spam, advertise, share contact details, post unlawful content or try to get around safety measures.</p>,
        },
        {
          id: "termination",
          title: "Suspension and ending your account",
          content: (
            <>
              <p>We may warn you, remove content, or suspend or close accounts for serious or repeated breaches, abuse, fraud or legal reasons.</p>
              <p>You can stop at any time and <a href="/delete-account">delete your account and data</a>.</p>
            </>
          ),
        },
        {
          id: "liability",
          title: "Availability and liability",
          content: <p>We aim for a reliable service but cannot guarantee uninterrupted availability or the accuracy of peer or team replies. To the extent the law allows, we are not liable for indirect losses. Nothing here excludes liability that cannot lawfully be excluded.</p>,
        },
        {
          id: "law",
          title: "Governing law and changes",
          content: (
            <>
              <p>Dutch law applies. If you are a consumer, the mandatory protections of your own country still apply.</p>
              <p>We may update these terms. We will publish the new version and update the date above. Questions? Use our <a href="/#contact">contact form</a>.</p>
            </>
          ),
        },
      ]}
    />
  );
}
