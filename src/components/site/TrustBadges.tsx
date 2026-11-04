import { EyeOff, ShieldCheck, Trash2, UserX } from "lucide-react";

/** Honest privacy promises: what we actually do, linked to the full policy. */
const BADGES = [
  { icon: UserX, title: "No real name needed", text: "Just an email and a nickname. Other users never see your email." },
  { icon: EyeOff, title: "Contact details hidden", text: "Phone numbers, emails, links and addresses are masked automatically." },
  { icon: ShieldCheck, title: "We never sell your data", text: "Ads and statistics only run if you say yes." },
  { icon: Trash2, title: "Delete anytime", text: "Remove your account and all your chats in one tap." },
];

export function TrustBadges() {
  return (
    <section aria-labelledby="trust-title" className="mx-auto w-full max-w-6xl px-5 py-12">
      <h2 id="trust-title" className="font-display text-2xl font-semibold">Your privacy, plainly</h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BADGES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-2xl border border-border bg-card p-5">
            <Icon className="size-6 text-primary" aria-hidden />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Chats are stored so our team can keep the service safe. They are not end-to-end encrypted. Read our{" "}
        <a href="/privacy" className="text-primary underline underline-offset-4">Privacy Policy</a>.
      </p>
    </section>
  );
}
