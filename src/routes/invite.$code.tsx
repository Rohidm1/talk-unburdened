import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { REF_KEY } from "@/components/site/ReferralRedeemer";

export const Route = createFileRoute("/invite/$code")({
  head: () => ({
    meta: [
      { title: "You're invited to Anontalk – 5 bonus credits" },
      { name: "description", content: "A friend invited you to Anontalk. Sign up and you both get 5 bonus credits to chat anonymously." },
      { property: "og:title", content: "You're invited to Anontalk" },
      { property: "og:description", content: "Sign up through this invite and you both get 5 bonus credits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (/^[a-z0-9]{6,12}$/i.test(code)) window.localStorage.setItem(REF_KEY, code.toLowerCase());
    void navigate({ to: "/auth", replace: true });
  }, [code, navigate]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center font-body">
      <div>
        <p className="text-4xl" aria-hidden>💌</p>
        <h1 className="mt-4 font-display text-2xl font-semibold">A friend invited you</h1>
        <p className="mt-2 text-muted-foreground">Sign up and you'll both get 5 bonus credits.</p>
      </div>
    </main>
  );
}
