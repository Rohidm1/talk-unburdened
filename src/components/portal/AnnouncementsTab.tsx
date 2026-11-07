import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteAnnouncement, listAnnouncements, postAnnouncement } from "@/lib/portal.functions";

export function AnnouncementsTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listAnnouncements);
  const post = useServerFn(postAnnouncement);
  const remove = useServerFn(deleteAnnouncement);
  const list = useQuery({ queryKey: ["announcements"], queryFn: () => fetchList(), refetchInterval: 30000 });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const postMutation = useMutation({
    mutationFn: () => post({ data: { title, body } }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      toast.success("Announcement posted");
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Staff Announcements</h1>
        <p className="text-sm text-muted-foreground">Operational updates, shift schedules and directives</p>
      </div>

      {isAdmin ? (
        <form
          onSubmit={(e) => { e.preventDefault(); postMutation.mutate(); }}
          className="space-y-3 rounded-xl border border-border bg-card p-5"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Broadcast New Announcement</h2>
          <Input placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
          <Textarea placeholder="Type bulletin content…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} required minLength={2} />
          <Button type="submit" size="sm" disabled={postMutation.isPending}>Post Announcement</Button>
        </form>
      ) : null}

      <div className="space-y-4">
        {(list.data ?? []).map((a) => (
          <article key={a.id} className="space-y-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{a.title}</h2>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {isAdmin ? (
                  <button type="button" aria-label="Delete announcement" onClick={() => removeMutation.mutate(a.id)} className="hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/85">{a.body}</p>
            <p className="pt-2 text-xs font-medium text-primary">Posted by: {a.author_name}</p>
          </article>
        ))}
        {list.data && list.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : null}
      </div>
    </div>
  );
}
