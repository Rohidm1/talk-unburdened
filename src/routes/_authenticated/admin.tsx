import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getAdminStats } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — Anontalk platform analytics" },
      {
        name: "description",
        content:
          "Anontalk admin overview: accounts, calls, talk minutes, revenue and listener availability.",
      },
      { property: "og:title", content: "Admin panel — Anontalk" },
      { property: "og:description", content: "Platform analytics for Anontalk operators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const fetchStats = useServerFn(getAdminStats);
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats(), retry: false });

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Admin panel</h1>
        <Button variant="outline" asChild>
          <Link to="/account">Back to account</Link>
        </Button>
      </div>

      {stats.isError ? (
        <p className="mt-8 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          You need admin access to view platform analytics.
        </p>
      ) : null}

      {stats.data ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Accounts", value: stats.data.totalUsers },
              { label: "Calls", value: stats.data.totalCalls },
              { label: "Talk minutes", value: stats.data.totalMinutes },
              { label: "Revenue", value: `€ ${(stats.data.revenueCents / 100).toFixed(2)}` },
            ].map((k) => (
              <div key={k.label} className="rounded-3xl border border-border bg-card p-6">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">{k.label}</p>
                <p className="mt-2 font-display text-3xl tabular-nums">{k.value}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Listeners</h2>
            <ul className="mt-4 divide-y divide-border">
              {stats.data.listeners.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                  <span>{l.display_name}</span>
                  <span className="text-muted-foreground">{l.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Recent calls</h2>
            {stats.data.recentCalls.length > 0 ? (
              <ul className="mt-4 divide-y divide-border">
                {stats.data.recentCalls.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(c.started_at).toLocaleString()}
                    </span>
                    <span className="tabular-nums">
                      {Math.floor(c.duration_seconds / 60)}m · € {(c.cost_cents / 100).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No calls recorded yet.</p>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
