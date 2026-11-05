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

const title = "Sign in to Anontalk — anonymous, alias-only accounts";
const description =
  "Create an alias-only Anontalk account to chat anonymously. Your first 5 messages are free, no real name required.";

export const Route = createFileRoute("/auth")({
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email_confirmed_at) void navigate({ to: "/account", replace: true });
    });
  }, [navigate]);

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
        if (!data.session) {
          setSent(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      void navigate({ to: "/account", replace: true });
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
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create your alias"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                No real names. Only your alias is ever shown to a chat partner.
              </p>

              <form onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-4">
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
