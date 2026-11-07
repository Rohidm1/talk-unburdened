import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { BarChart3, Bell, Flag, LogOut, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPortalMe } from "@/lib/portal.functions";
import { setMyStatus } from "@/lib/staff.functions";
import { AnalyticsTab } from "@/components/portal/AnalyticsTab";
import { Workstation } from "@/components/portal/Workstation";
import { AdminMonitor } from "@/components/portal/AdminMonitor";
import { AnnouncementsTab } from "@/components/portal/AnnouncementsTab";
import { ManagementTab } from "@/components/portal/ManagementTab";
import { ReportsPanel } from "@/components/site/ReportsPanel";

const tabs = ["analytics", "messages", "announcements", "management", "reports"] as const;
type Tab = (typeof tabs)[number];
type Availability = "available" | "break" | "offline";

export const Route = createFileRoute("/crm/")({
  validateSearch: z.object({ tab: z.enum(tabs).optional() }),
  head: () => ({
    meta: [
      { title: "Open Ear Portal — team workspace" },
      { name: "description", content: "Internal Open Ear workspace for agents and admins." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Open Ear Portal" },
      { property: "og:description", content: "Internal team workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portal,
});

const statusOptions: { value: Availability; label: string; dot: string; active: string }[] = [
  { value: "available", label: "Online", dot: "bg-success animate-pulse", active: "bg-success text-success-foreground" },
  { value: "break", label: "Break", dot: "bg-warning", active: "bg-warning text-background" },
  { value: "offline", label: "Offline", dot: "bg-muted-foreground", active: "bg-muted text-foreground" },
];

function Portal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const fetchMe = useServerFn(getPortalMe);
  const saveStatus = useServerFn(setMyStatus);
  const me = useQuery({ queryKey: ["portal-me"], queryFn: () => fetchMe() });
  const [status, setStatus] = useState<Availability>("offline");

  const isAdmin = me.data?.role === "admin";
  const tab: Tab = search.tab ?? (isAdmin ? "analytics" : "messages");

  useEffect(() => {
    if (me.data) setStatus(me.data.availability);
  }, [me.data]);

  // Keep the shift fresh so routing knows this agent is still here.
  useEffect(() => {
    if (status === "offline") return;
    const id = window.setInterval(() => void saveStatus({ data: { availability: status } }), 30000);
    return () => window.clearInterval(id);
  }, [status, saveStatus]);

  const statusMutation = useMutation({
    mutationFn: (value: Availability) => saveStatus({ data: { availability: value } }),
    onMutate: (value) => setStatus(value),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["portal-me"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    if (status !== "offline") await saveStatus({ data: { availability: "offline" } }).catch(() => null);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/crm-login", replace: true });
  };

  const go = (t: Tab) => void navigate({ to: "/crm", search: { tab: t } });

  const nav: { id: Tab; label: string; icon: typeof BarChart3; adminOnly?: boolean }[] = [
    { id: "analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "management", label: "Agent Management", icon: Users, adminOnly: true },
    { id: "reports", label: "Reports", icon: Flag, adminOnly: true },
  ];

  if (me.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        This account has no portal access.
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-body text-foreground">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">OE</span>
            <span className="font-display text-lg font-bold">Open Ear</span>
            <span className="rounded border border-border bg-secondary px-2 py-0.5 text-xs uppercase text-muted-foreground">
              {isAdmin ? "Admin" : "Agent"}
            </span>
          </div>
          <nav aria-label="Portal sections" className="flex flex-wrap gap-1">
            {nav
              .filter((n) => !n.adminOnly || isAdmin)
              .map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => go(n.id)}
                  aria-current={tab === n.id ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    tab === n.id
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <n.icon className="size-4" /> {n.label}
                </button>
              ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div role="radiogroup" aria-label="Your status" className="flex rounded-xl border border-border bg-background p-1">
            {statusOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={status === o.value}
                onClick={() => statusMutation.mutate(o.value)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  status === o.value ? o.active : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`size-2 rounded-full ${o.dot}`} /> {o.label}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold">{me.data?.username ?? "…"}</p>
            <p className="text-[10px] capitalize text-muted-foreground">{me.data?.role ?? ""}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Log out"
            title="Log out"
            className="rounded-lg bg-secondary p-2 text-muted-foreground transition hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {!me.data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tab === "analytics" && isAdmin ? (
          <AnalyticsTab />
        ) : tab === "messages" ? (
          isAdmin ? (
            <AdminMonitor />
          ) : (
            <Workstation online={status === "available"} username={me.data.username} />
          )
        ) : tab === "announcements" ? (
          <AnnouncementsTab isAdmin={isAdmin} />
        ) : tab === "management" && isAdmin ? (
          <ManagementTab />
        ) : tab === "reports" && isAdmin ? (
          <div className="mx-auto max-w-5xl"><ReportsPanel /></div>
        ) : (
          <Workstation online={status === "available"} username={me.data.username} />
        )}
      </main>
    </div>
  );
}
