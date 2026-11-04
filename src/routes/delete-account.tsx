import { createFileRoute, Link } from "@tanstack/react-router";
import "@/lib/i18n";
import { LegalPage } from "@/components/site/LegalPage";
import { breadcrumbSchema, jsonLd, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    ...pageHead({
      title: "Delete Your Account & Data | Anontalk",
      description: "How to delete your Anontalk account and all its data, including what to do if you cannot sign in.",
      path: "/delete-account",
    }),
    scripts: [jsonLd(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Delete account & data", path: "/delete-account" }]))],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete your account & data"
      summary="Sign in, open My account and tap “Delete account & data”. Your account, nickname, email, credits, chats, posts, bottles and votes are removed right away. If you cannot sign in, send a request through our contact form from your account email."
      sections={[
        {
          id: "signed-in",
          title: "Delete while signed in",
          content: (
            <>
              <p>Open <Link to="/account">My account</Link>, scroll to “Delete account &amp; data”, type DELETE to confirm and tap the button.</p>
              <p>This cannot be undone. Any remaining credits are lost.</p>
            </>
          ),
        },
        {
          id: "deleted",
          title: "What is deleted",
          content: (
            <ul>
              <li>Your account, nickname and email address.</li>
              <li>Your credit balance and credit history.</li>
              <li>Your chats and Speed Chat messages.</li>
              <li>Your bottles, bottle replies, dilemma votes and arguments.</li>
              <li>Your community posts are emptied and removed from view.</li>
            </ul>
          ),
        },
        { id: "retained", title: "What is kept", content: <p>Payment records that tax law requires are kept by our payment providers (Stripe or Google), typically for seven years in the Netherlands.</p> },
        { id: "cannot-sign-in", title: "If you cannot sign in", content: <p>Use the <a href="/#contact">contact form</a> with your account email and ask for your Anontalk account to be deleted. We may need to confirm the account is yours. Never send your password or card details.</p> },
      ]}
    />
  );
}
