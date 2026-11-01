import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function SupportInbox() {
  const qc = useQueryClient();
  const tickets = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  async function setStatus(id: string, status: string) {
    await supabase.from("support_tickets").update({ status }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["support-tickets"] });
  }

  if (tickets.isLoading) return <p className="text-sm text-muted-foreground">Laden…</p>;
  if (!tickets.data?.length) return <p className="text-sm text-muted-foreground">No tickets.</p>;

  return (
    <div className="space-y-3">
      {tickets.data.map((t) => (
        <details key={t.id} className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{t.category}</span>
              <span className={t.status === "open" ? "text-warning" : "text-muted-foreground"}>
                {t.status}
              </span>
              <span className="text-muted-foreground">
                {new Date(t.created_at).toLocaleString("en-GB")}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">{t.summary}</p>
          </summary>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs">{t.transcript}</pre>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {t.email ? (
              <a
                className="rounded-full bg-primary px-3 py-1 text-primary-foreground"
                href={`mailto:${t.email}?subject=${encodeURIComponent("Re: your Anontalk message")}`}
              >
                Beantwoorden per e-mail
              </a>
            ) : (
              <span className="text-muted-foreground">No email address provided</span>
            )}
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1"
              onClick={() => void setStatus(t.id, t.status === "open" ? "closed" : "open")}
            >
              {t.status === "open" ? "Close" : "Reopen"}
            </button>
          </div>
        </details>
      ))}
    </div>
  );
}
