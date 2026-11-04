import { createFileRoute } from "@tanstack/react-router";
import "@/lib/i18n";
import { LegalPage } from "@/components/site/LegalPage";
import { breadcrumbSchema, jsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    ...pageHead({
      title: "Privacy Policy (GDPR) | Anontalk",
      description: "How Open Ear Collective processes your Anontalk data, stores conversations and handles your GDPR privacy rights.",
      path: "/privacy",
    }),
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Privacy Policy", path: "/privacy" }]))],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="Open Ear Collective processes your information to run Anontalk, provide credits and conversations, and keep the community safe. You only need an email and a nickname. Chat messages are stored, are not end-to-end encrypted, and may be reviewed by our team or sent to an AI model provider to generate replies. Optional statistics and advertising cookies need your consent, and we never sell your data."
      sections={[
        {
          id: "controller",
          title: "Who is responsible",
          content: (
            <>
              <p>Open Ear Collective is the controller for personal data processed through Anontalk at https://anontalk.online. This policy explains our processing under the EU General Data Protection Regulation (GDPR), known in Dutch as the AVG. Anontalk is for people aged 18 and over.</p>
              <p className="rounded-xl border border-border bg-card p-4 font-semibold text-foreground">Registered address and registration number: to be published</p>
              <p>For privacy questions or requests, please use our <a href="/#contact">contact form</a>.</p>
            </>
          ),
        },
        {
          id: "data",
          title: "Information we process",
          content: (
            <ul>
              <li>Email address, chosen nickname (no real name is needed), password (stored hashed by our sign-in provider) and approximate signup country.</li>
              <li>Credit balance and purchase history, including whether you paid by card (Stripe) or Google Play.</li>
              <li>Chat messages, Speed Chat messages, community topics, replies and votes, bottle messages, buddy notes, dilemma votes and arguments, reports and blocks, and support tickets.</li>
              <li>Reward records: daily fortune claims, Mood SOS completion days and invite referrals.</li>
              <li>Journal entries and mood check-ins in the Wellness toolkit stay in your browser only and are never sent to us.</li>
              <li>Only after cookie consent: basic visit statistics (page path, referrer, country and a random visitor ID).</li>
            </ul>
          ),
        },
        {
          id: "messages",
          title: "Stored conversations and automated replies",
          content: (
            <>
              <p>Chat messages are stored so our team can review conversations for safety, handle abuse reports and improve reply quality. Phone numbers, email addresses, links, social handles and street addresses are automatically masked before messages are saved. Masking may not catch everything, so please do not share identifying details about yourself or others.</p>
              <p>Chats are not end-to-end encrypted. A nickname means other users do not see who you are; it does not make you anonymous to the service or its providers.</p>
              <p>When no team member is available, some chat replies may be written or assisted by automated systems (AI). The support assistant is AI. Message text is sent to an AI model provider for this purpose.</p>
            </>
          ),
        },
        {
          id: "bases",
          title: "Purposes and legal bases",
          content: (
            <ul>
              <li>Contract: providing your account, conversations, purchases and credits.</li>
              <li>Legitimate interests: safety review, abuse prevention, security and reply-quality review.</li>
              <li>Consent: optional statistics and advertising cookies. You can withdraw consent at any time.</li>
              <li>Legal obligation: keeping required tax and payment records.</li>
            </ul>
          ),
        },
        {
          id: "providers",
          title: "Providers and international transfers",
          content: (
            <>
              <ul>
                <li>Lovable Cloud: hosting and database (EU/US).</li>
                <li>Stripe: card payments.</li>
                <li>Google: Google Play Billing for in-app purchases, and Google AdSense advertising only with consent.</li>
                <li>Weglot: page translation.</li>
                <li>AI model providers through an AI gateway: generating automated replies.</li>
              </ul>
              <p>Where personal data is transferred outside the EEA, we rely on Standard Contractual Clauses. We do not sell personal data.</p>
            </>
          ),
        },
        {
          id: "retention",
          title: "Retention and account deletion",
          content: (
            <>
              <p>Your account and stored contributions are deleted when you use Account &gt; Delete account &amp; data. See our <a href="/delete-account">account deletion page</a>.</p>
              <p>Payment records required by tax law are kept by our payment providers, typically for seven years in the Netherlands.</p>
            </>
          ),
        },
        {
          id: "rights",
          title: "Your rights and complaints",
          content: (
            <>
              <p>You may request access, rectification, erasure, restriction and portability, and object to processing based on legitimate interests. You can change your cookie choice on our <a href="/cookies">Cookie &amp; Data Statement</a>.</p>
              <p>Send requests through the <a href="/#contact">contact form</a>, preferably from your account email. We normally respond within one month.</p>
              <p>You may complain to the Dutch <a href="https://autoriteitpersoonsgegevens.nl/">Autoriteit Persoonsgegevens</a> or your local supervisory authority.</p>
            </>
          ),
        },
      ]}
    />
  );
}
