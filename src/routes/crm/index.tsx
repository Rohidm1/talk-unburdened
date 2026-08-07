import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, LogOut, ShieldCheck, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { avatarFor } from "@/lib/avatars";
import {
  createWorker,
  listTeam,
  resetWorkerPassword,
  setListenerActive,
  setListenerAgents,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/crm/")({
  head: () => ({
    meta: [
      { title: "Team screen — Anontalk CRM" },
      {
        name: "description",
        content: "Create listener logins, reset passwords and manage who is live on Anontalk.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Team screen — Anontalk CRM" },
      { property: "og:description", content: "Internal team management for Anontalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrmTeam,
});

const avatarKeys = ["listener-1", "listener-2", "listener-3", "listener-4"];

const emptyForm = {
  username: "",
  password: "",
  displayName: "",
  avatarKey: "listener-1",
  bioEn: "",
  bioNl: "",
  languages: "NL, EN",
  topicsEn: "",
  topicsNl: "",
  years: "3",
};

function CrmTeam() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchTeam = useServerFn(listTeam);
  const addWorker = useServerFn(createWorker);
  const resetPassword = useServerFn(resetWorkerPassword);
  const toggleActive = useServerFn(setListenerActive);
  const saveAgents = useServerFn(setListenerAgents);

  const [form, setForm] = useState(emptyForm);
  const [linkTo, setLinkTo] = useState("");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [agentsFor, setAgentsFor] = useState<string | null>(null);

  const team = useQuery({ queryKey: ["crm-team"], queryFn: () => fetchTeam(), retry: false });

  const createMutation = useMutation({
    mutationFn: () =>
      addWorker({
        data: {
          username: form.username,
          password: form.password,
          displayName: form.displayName,
          avatarKey: form.avatarKey,
          bioEn: form.bioEn || "—",
          bioNl: form.bioNl || form.bioEn || "—",
          languages: form.languages
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          topicsEn: form.topicsEn
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          topicsNl: (form.topicsNl || form.topicsEn)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          years: Number(form.years) || 0,
          existingListenerId: linkTo || null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Login created for ${res.username}`);
      setForm(emptyForm);
      setLinkTo("");
      void queryClient.invalidateQueries({ queryKey: ["crm-team"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create login"),
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetPassword({ data: { userId, password: newPassword } }),
    onSuccess: () => {
      toast.success("Password updated");
      setResetFor(null);
      setNewPassword("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update password"),
  });

  const activeMutation = useMutation({
    mutationFn: (v: { listenerId: string; isActive: boolean }) => toggleActive({ data: v }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["crm-team"] }),
  });

  const agentsMutation = useMutation({
    mutationFn: (v: { listenerId: string; agentUserIds: string[] }) => saveAgents({ data: v }),
    onSuccess: () => {
      toast.success("Agents updated");
      void queryClient.invalidateQueries({ queryKey: ["crm-team"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update agents"),
  });

  const toggleAgent = (listenerId: string, current: string[], agentId: string) => {
    const next = current.includes(agentId)
      ? current.filter((id) => id !== agentId)
      : [...current, agentId];
    agentsMutation.mutate({ listenerId, agentUserIds: next });
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/crm-login", replace: true });
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 font-body">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Team screen</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin">Analytics</Link>
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      {team.isError ? (
        <p className="mt-8 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          This account does not have CRM admin access.
        </p>
      ) : null}

      {team.data ? (
        <>
          <section className="mt-8 rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Listeners</h2>
            <ul className="mt-4 divide-y divide-border">
              {team.data.listeners.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-4 py-4">
                  <img
                    src={avatarFor(l.avatar_key)}
                    alt={`${l.display_name} profile`}
                    className="size-11 rounded-full object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{l.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.login ? `login: ${l.login}` : "no login linked"} · {l.status}
                      {l.is_active ? "" : " · hidden"}
                    </p>
                  </div>
                  {l.user_id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResetFor(resetFor === l.user_id ? null : l.user_id)}
                    >
                      <KeyRound className="size-4" /> Password
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAgentsFor(agentsFor === l.id ? null : l.id)}
                  >
                    <Users className="size-4" /> Agents ({l.agentIds.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      activeMutation.mutate({ listenerId: l.id, isActive: !l.is_active })
                    }
                  >
                    {l.is_active ? "Hide" : "Show"}
                  </Button>
                  {agentsFor === l.id ? (
                    <div className="w-full rounded-2xl border border-border bg-secondary/30 p-4">
                      <p className="text-sm font-medium">
                        Who can take calls for {l.display_name}?
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        One agent can be assigned to as many profiles as you like. Callers keep
                        their preferred agent whenever that person is available.
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {team.data.agents.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No agent logins yet.</p>
                        ) : (
                          team.data.agents.map((a) => (
                            <label key={a.userId} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="size-4 accent-primary"
                                checked={l.agentIds.includes(a.userId)}
                                disabled={agentsMutation.isPending}
                                onChange={() => toggleAgent(l.id, l.agentIds, a.userId)}
                              />
                              <span>{a.username}</span>
                              <span className="text-xs text-muted-foreground">· {a.status}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                  {resetFor && resetFor === l.user_id ? (
                    <div className="flex w-full gap-2">
                      <Input
                        type="text"
                        placeholder="New password (min 8 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        size="sm"
                        disabled={newPassword.length < 8 || resetMutation.isPending}
                        onClick={() => resetMutation.mutate(l.user_id!)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <UserPlus className="size-4" /> Create a listener login
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You set the username and password directly and hand them to your worker. They sign in
              at /crm-login and land on the listener desk.
            </p>
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="linkTo">Profile</Label>
                <select
                  id="linkTo"
                  value={linkTo}
                  onChange={(e) => setLinkTo(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Create a new listener profile</option>
                  {team.data.listeners
                    .filter((l) => !l.user_id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        Link to existing: {l.display_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="years">Years listening</Label>
                <Input
                  id="years"
                  type="number"
                  min={0}
                  max={60}
                  value={form.years}
                  onChange={(e) => setForm({ ...form, years: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="languages">Languages (comma separated)</Label>
                <Input
                  id="languages"
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Avatar</Label>
                <div className="flex gap-2">
                  {avatarKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, avatarKey: key })}
                      className={`size-11 overflow-hidden rounded-full border-2 ${
                        form.avatarKey === key ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={avatarFor(key)} alt={`Avatar option ${key}`} loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="topicsEn">Topics EN (comma separated)</Label>
                <Input
                  id="topicsEn"
                  value={form.topicsEn}
                  onChange={(e) => setForm({ ...form, topicsEn: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="topicsNl">Topics NL (comma separated)</Label>
                <Input
                  id="topicsNl"
                  value={form.topicsNl}
                  onChange={(e) => setForm({ ...form, topicsNl: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="bioEn">Short intro (EN)</Label>
                <Textarea
                  id="bioEn"
                  required={!linkTo}
                  maxLength={500}
                  value={form.bioEn}
                  onChange={(e) => setForm({ ...form, bioEn: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="bioNl">Short intro (NL)</Label>
                <Textarea
                  id="bioNl"
                  maxLength={500}
                  value={form.bioNl}
                  onChange={(e) => setForm({ ...form, bioNl: e.target.value })}
                />
              </div>
              <Button type="submit" className="sm:col-span-2" disabled={createMutation.isPending}>
                Create login
              </Button>
            </form>
          </section>
        </>
      ) : null}
    </main>
  );
}
