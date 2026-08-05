import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getMyAccount } from "@/lib/account.functions";
import { addNote, listMyNotes, setMyStatus } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Listener desk — Anontalk staff dashboard" },
      {
        name: "description",
        content:
          "Set your availability and keep private conversation notes as an Anontalk listener.",
      },
      { property: "og:title", content: "Listener desk — Anontalk" },
      { property: "og:description", content: "Availability and private notes for listeners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

const statuses = ["online", "busy", "offline"] as const;

function StaffPage() {
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchNotes = useServerFn(listMyNotes);
  const saveStatus = useServerFn(setMyStatus);
  const createNote = useServerFn(addNote);

  const [body, setBody] = useState("");
  const [clientAlias, setClientAlias] = useState("");

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => fetchNotes() });

  const statusMutation = useMutation({
    mutationFn: (status: (typeof statuses)[number]) => saveStatus({ data: { status } }),
    onSuccess: () => {
      toast.success("Availability updated.");
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["listeners"] });
    },
    onError: () => toast.error("Could not update availability."),
  });

  const noteMutation = useMutation({
    mutationFn: () => createNote({ data: { body, clientAlias: clientAlias || undefined } }),
    onSuccess: () => {
      setBody("");
      setClientAlias("");
      toast.success("Note saved.");
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: () => toast.error("Only listeners can save notes."),
  });

  const isStaff = account.data?.roles.includes("staff");
  const listener = account.data?.listener;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Listener desk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {listener ? `Signed in as ${listener.display_name}` : "Your listener profile"}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/account">Back to account</Link>
        </Button>
      </div>

      {!isStaff ? (
        <p className="mt-8 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          This desk is for listeners. Ask an admin to grant you the listener role.
        </p>
      ) : (
        <>
          <section className="mt-8 rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Availability</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your status updates live on the homepage.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {statuses.map((s) => (
                <Button
                  key={s}
                  variant={listener?.status === s ? "default" : "outline"}
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(s)}
                >
                  {s === "online" ? "Available" : s === "busy" ? "In a call" : "Offline"}
                </Button>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <NotebookPen className="size-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Private notes</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Only you can read these. Use aliases only — never real details.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="calias">Alias</Label>
                <Input
                  id="calias"
                  value={clientAlias}
                  onChange={(e) => setClientAlias(e.target.value)}
                  placeholder="e.g. Sam"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What was helpful, what to pick up next time…"
                />
              </div>
              <Button
                disabled={body.trim().length === 0 || noteMutation.isPending}
                onClick={() => noteMutation.mutate()}
              >
                Save note
              </Button>
            </div>

            {notes.data && notes.data.length > 0 ? (
              <ul className="mt-6 flex flex-col gap-3">
                {notes.data.map((n) => (
                  <li key={n.id} className="rounded-2xl border border-border bg-secondary/30 p-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{n.client_alias ?? "Anon"}</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{n.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">No notes yet.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
