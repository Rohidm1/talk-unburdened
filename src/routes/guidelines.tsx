import { createFileRoute } from "@tanstack/react-router";
import "@/lib/i18n";
import { LegalPage } from "@/components/site/LegalPage";
import { breadcrumbSchema, jsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    ...pageHead({
      title: "Community & Ethics Guidelines | Anontalk",
      description: "Anontalk's code of conduct for respectful, harassment-free conversations, privacy, reporting and safety.",
      path: "/guidelines",
    }),
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Community Guidelines", path: "/guidelines" }]))],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <LegalPage
      title="Community & Ethics Guidelines"
      summary="Anontalk is an 18+ space for kind, respectful peer conversations. Harassment, hate, threats, doxxing, spam and any sexual content involving minors are not allowed. Keep contact details to yourself, and use the Report button or our contact form if something goes wrong."
      sections={[
        { id: "respect", title: "Respect and care", content: <p>Listen without judging, respect boundaries and disagree with ideas, not people. Nobody owes you a reply, personal information or a longer conversation.</p> },
        {
          id: "prohibited",
          title: "What we do not allow",
          content: (
            <ul>
              <li>Harassment, bullying, hate, discrimination or threats.</li>
              <li>Any sexual content involving minors, grooming or exploitation. Anontalk is for adults only.</li>
              <li>Doxxing or sharing someone else's private information.</li>
              <li>Advertising, scams or spam.</li>
              <li>Encouraging harm or using Anontalk for anything illegal.</li>
            </ul>
          ),
        },
        { id: "privacy", title: "Keep contact details private", content: <p>Do not share phone numbers, email addresses, links, social handles or addresses. They are masked automatically, but masking can miss things. Do not try to get around it or pressure others to move elsewhere.</p> },
        {
          id: "wellbeing",
          title: "Look after yourself and others",
          content: (
            <>
              <p>Share only what feels comfortable. Take a break or end a conversation whenever you need to. Offer kindness, not diagnoses or professional-sounding instructions.</p>
              <p>Anontalk is peer conversation, not an emergency service. If someone is in immediate danger, call 112 or the local emergency number.</p>
            </>
          ),
        },
        { id: "reporting", title: "How to report", content: <p>Use the Report button in Speed Chat or our <a href="/#contact">contact form</a>. Say what happened, where and roughly when.</p> },
        { id: "consequences", title: "Consequences", content: <p>Depending on how serious or repeated a breach is, we may warn you, remove content or suspend your account. See also our <a href="/terms">Terms of Service</a>.</p> },
      ]}
    />
  );
}
