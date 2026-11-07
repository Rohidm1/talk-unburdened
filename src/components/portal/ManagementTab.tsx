import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTeamAccount, listTeamAccounts, resetTeamPassword } from "@/lib/portal.functions";
import { deleteAgentAccount } from "@/lib/crm.functions";

export function ManagementTab() {
  const queryClient = useQueryClient();
  const fetchAccounts = useServerFn(listTeamAccounts);
  const create = useServerFn(createTeamAccount);
  const reset = useServerFn(resetTeamPassword);
  const remove = useServerFn(deleteAgentAccount);
  const accounts = useQuery({ queryKey: ["team-accounts"], queryFn: () => fetchAccounts() });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"agent" | "admin">("agent");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["team-accounts"] });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { username, password, role } }),
    onSuccess: (r) => {
      toast.success(`Account '${r.username}' created`);
      setUsername("");
      setPassword("");
      setRole("agent");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetMutation = useMutation({
    mutationFn: (userId: string) => reset({ data: { userId, password: newPassword } }),
    onSuccess: () => {
      toast.success("Password updated");
      setResetFor(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => { toast.success("Account deleted"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Agent &amp; Account Management</h1>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-bold">Create Agent Credentials</h2>
        <p className="mb-4 text-xs text-muted-foreground">Passwords need at least 10 characters. Share them privately.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          className="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <Input placeholder="Assign username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} pattern="[a-zA-Z0-9._-]+" aria-label="Username" />
          <Input type="password" placeholder="Assign password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} aria-label="Password" autoComplete="new-password" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "agent" | "admin")}
            aria-label="Role"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" disabled={createMutation.isPending}>Create Account</Button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-bold">Team accounts</h2>
        <ul className="divide-y divide-border">
          {(accounts.data ?? []).map((a) => (
            <li key={a.userId} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                {a.username[0]?.toUpperCase()}
              </span>
              <span className="min-w-32 flex-1 text-sm font-medium">
                {a.username} {a.isMe ? <span className="text-xs text-muted-foreground">(you)</span> : null}
              </span>
              <span className="rounded border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">{a.role}</span>
              <Button size="sm" variant="outline" onClick={() => setResetFor(resetFor === a.userId ? null : a.userId)}>
                <KeyRound className="size-4" /> Password
              </Button>
              {a.role === "agent" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${a.username}`}
                  onClick={() => { if (window.confirm(`Delete ${a.username}? This cannot be undone.`)) removeMutation.mutate(a.userId); }}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
              {resetFor === a.userId ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); resetMutation.mutate(a.userId); }}
                  className="flex w-full gap-2"
                >
                  <Input type="password" placeholder="New password (10+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={10} required autoComplete="new-password" />
                  <Button type="submit" size="sm" disabled={resetMutation.isPending}>Save</Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
