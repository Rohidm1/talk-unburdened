import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/anontalk-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrationSchema } from "@/lib/account-access";
import { lovable } from "@/integrations/lovable/index";
import { listeners } from "@/data/listeners";

type AuthSearch = { partner?: string; redirect?: string };

const title = "Sign in to Anontalk — anonymous, alias-only accounts";
const description =
  "Create an alias-only Anontalk account to chat anonymously. Your first 5 messages are free, no real name required.";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    ...(typeof search["partner"] === "string" && /^[\w-]{1,40}$/.test(search["partner"]) ? { partner: search["partner"] } : {}),
    ...(typeof search["redirect"] === "string" && search["redirect"].startsWith("/") && !search["redirect"].startsWith("//")
      ? { redirect: search["redirect"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { partner: partnerId, redirect } = Route.useSearch();
  const partner = partnerId ? listeners.find((l) => l.id === partnerId) : undefined;
  const [mode, setMode] = useState<"signin" | "signup">(partner ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const goNext = () => {
    if (partner) void navigate({ to: "/", search: { partner: partner.id }, replace: true });
    else if (redirect) void navigate({ to: redirect, replace: true });
    else void navigate({ to: "/account", replace: true });
  };

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email_confirmed_at) goNext();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const google = async () => {
    setBusy(true);
    if (partner) window.sessionStorage.setItem("at.pendingPartner", partner.id);
    window.__lovableEvents?.track?.("project.signup_started", { method: "google", with_partner: !!partner });
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in did not complete. Please try again.");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    goNext();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const registration = registrationSchema.safeParse({ email, alias, password });
        if (!registration.success) throw new Error(registration.error.issues[0]?.message ?? "Check your registration details.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { alias: alias.trim() },
          },
        });
        if (error) throw error;
        window.__lovableEvents?.track?.("project.signup_completed", { method: "email", with_partner: !!partner });
        if (!data.session) {
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      goNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 font-body">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center" aria-label="Anontalk home">
          <img src={logo} alt="Anontalk" width={640} height={175} className="h-10 w-auto" />
        </Link>

        <div className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          {sent ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-semibold">Check your email</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We have sent a verification link to your email. Please check your inbox and verify your account to continue.
              </p>
            </div>
          ) : (
            <>
              {partner ? (
                <div className="mb-5 flex items-center gap-3 rounded-2xl bg-secondary p-3">
                  <img src={partner.avatar} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                  <p className="text-sm">
                    <span className="block font-semibold">{partner.displayName} is free to chat</span>
                    <span className="text-muted-foreground">Create your alias and your first 5 messages are free.</span>
                  </p>
                </div>
              ) : null}
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {mode === "signin" ? "Welcome back" : partner ? `Message ${partner.displayName}` : "Create your alias"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                No real names. Only your alias is ever shown to a chat partner.
              </p>

              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void google()}
                className="mt-6 h-11 w-full gap-[10px] border-[#8E918F] bg-[#131314] px-3 text-sm font-medium text-[#E3E3E3] hover:bg-[#131314] hover:text-[#E3E3E3]"
              >
                <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                Continue with Google
              </Button>
              <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={(e) => void submit(e)} className="mt-5 flex flex-col gap-4">
                {mode === "signup" ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="alias">Nickname</Label>
                    <Input
                      id="alias"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      placeholder="e.g. Sam"
                      maxLength={24}
                      required
                      minLength={2}
                    />
                  </div>
                ) : null}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy} className="mt-1">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode === "signin" ? "Log in" : "Sign up"}
                </Button>
              </form>

              <Button variant="ghost"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                {mode === "signin" ? "No account yet? Sign up" : "Already have an alias? Log in"}
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
