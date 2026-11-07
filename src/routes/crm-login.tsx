import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Shield, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/crm-username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const title = "Open Ear Portal — team sign-in";
const description = "Private sign-in for the Open Ear team and admins.";

export const Route = createFileRoute("/crm-login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalLogin,
});

type Role = "agent" | "admin";

function PortalLogin() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (signInError || !data.user) {
      setBusy(false);
      setError("Wrong username or password.");
      return;
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    const { data: isStaff } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "staff",
    });
    if ((role === "admin" && !isAdmin) || (role === "agent" && !isStaff && !isAdmin)) {
      await supabase.auth.signOut();
      setBusy(false);
      setError(role === "admin" ? "This account is not an admin account." : "This account is not a team account.");
      return;
    }
    setBusy(false);
    void navigate({ to: "/crm", search: { tab: role === "admin" ? "analytics" : "messages" }, replace: true });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 font-body text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
            <Shield className="size-8" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Open Ear Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">Internal Support &amp; Management Operations</p>
        </div>

        {!role ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setRole("agent")}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary p-4 text-left font-medium transition hover:bg-secondary/70"
            >
              <span className="flex items-center gap-3">
                <UserCheck className="size-5 text-primary" /> Log in as Agent
              </span>
              <span aria-hidden className="text-xs text-muted-foreground">&rarr;</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className="flex w-full items-center justify-between rounded-xl border border-primary/40 bg-primary/10 p-4 text-left font-medium transition hover:bg-primary/20"
            >
              <span className="flex items-center gap-3">
                <Shield className="size-5 text-primary" /> Log in as Admin
              </span>
              <span aria-hidden className="text-xs text-muted-foreground">&rarr;</span>
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Logging in as {role}
              </span>
              <button
                type="button"
                onClick={() => { setRole(null); setError(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Change role
              </button>
            </div>
            {error ? (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs">
                <AlertCircle className="size-4 shrink-0 text-destructive" /> {error}
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Access Portal
            </Button>
          </form>
        )}

        <div className="mt-8 border-t border-border pt-4 text-center">
          <p className="text-xs text-muted-foreground">100% Human Operated Support Service</p>
        </div>
      </div>
    </main>
  );
}
