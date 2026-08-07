import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BellRing,
  Clock,
  Inbox,
  LogOut,
  MessageCircle,
  Pause,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMyAccount } from "@/lib/account.functions";
import { setMyStatus } from "@/lib/staff.functions";
import {
  acceptChat,
  claimNextChat,
  closeChatAsAgent,
  declineChat,
  listMyChats,
} from "@/lib/chat.functions";
import { AgentChatPanel } from "@/components/site/AgentChatPanel";
import { useInboxAlert } from "@/hooks/useInboxAlert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Agent desk — Anontalk" },
      {
        name: "description",
        content: "Manage availability and handle incoming anonymous chat requests.",
      },
      { property: "og:title", content: "Agent desk — Anontalk" },
      { property: "og:description", content: "Agent chat queue and conversation handling." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

type Availability = "available" | "break" | "offline";

type ChatItem = Awaited<ReturnType<typeof listMyChats>>[number];

function statusLabel(av: Availability) {
  switch (av) {
    case "available":
      return "Online";
    case "break":
      return "Pauze";
    default:
      return "Offline";
  }
}

function statusIcon(av: Availability) {
  switch (av) {
    case "available":
      return <Power className="size-4 text-green-500" />;
    case "break":
      return <Pause className="size-4 text-amber-500" />;
    default:
      return <PowerOff className="size-4 text-muted-foreground" />;
  }
}

function StaffPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchChats = useServerFn(listMyChats);
  const saveStatus = useServerFn(setMyStatus);
  const claim = useServerFn(claimNextChat);
  const accept = useServerFn(acceptChat);
  const decline = useServerFn(declineChat);
  const close = useServerFn(closeChatAsAgent);

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const chats = useQuery({ queryKey: ["my-chats"], queryFn: () => fetchChats(), refetchInterval: 3000 });

  const [availability, setAvailability] = useState<Availability>("offline");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (account.data?.agentAvailability) {
      setAvailability(account.data.agentAvailability as Availability);
    }
  }, [account.data?.agentAvailability]);

  useEffect(() => {
    if (availability !== "available") return;
    const refreshPresence = () => {
      void saveStatus({ data: { availability: "available" } });
    };
    refreshPresence();
    const id = window.setInterval(refreshPresence, 30000);
    return () => window.clearInterval(id);
  }, [availability, saveStatus]);

  useInboxAlert(
    availability === "available"
      ? (chats.data?.filter((c) => c.status === "ringing" || c.status === "queued").length ?? 0)
      : 0,
  );

  const statusMutation = useMutation({
    mutationFn: (value: Availability) => saveStatus({ data: { availability: value } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("Status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (result) => {
      if (result.sessionId) {
        void queryClient.invalidateQueries({ queryKey: ["my-chats"] });
        setSelectedChatId(result.sessionId);
        toast.success("New chat assigned");
      } else {
        toast.info("No incoming chats waiting");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => accept({ data: { sessionId: id } }),
    onSuccess: async (result, id) => {
      if (!result.ok) {
        toast.error("This request is no longer available.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["my-chats"] });
      setSelectedChatId(id);
      toast.success("Chat accepted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => decline({ data: { sessionId: id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-chats"] });
      toast.success("Chat declined");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => close({ data: { sessionId: id } }),
    onSuccess: () => {
      setSelectedChatId(null);
      setShowEndConfirm(false);
      void queryClient.invalidateQueries({ queryKey: ["my-chats"] });
      toast.success("Chat closed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const activeChat = (chats.data ?? []).find((c) => c.id === selectedChatId && !c.endedAt) ?? null;
  const ringing = (chats.data ?? []).filter((c) => c.status === "ringing" || c.status === "queued");
  const open = (chats.data ?? []).filter((c) => c.status === "active" && !c.endedAt);

  const roles = account.data?.roles ?? [];
  if (account.isLoading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background font-body">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-primary" />
          <h1 className="font-display text-lg font-semibold">Agent desk</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
            {statusIcon(availability)}
            <span className="hidden sm:inline">{statusLabel(availability)}</span>
          </div>
          {roles.includes("admin") ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">Admin</Link>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-full flex-col border-r border-border sm:w-80">
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Set availability</Label>
              <div className="flex items-center gap-2">
                <BellRing className="size-4 text-muted-foreground" />
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  aria-label="Toggle notification sound"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["available", "break", "offline"] as Availability[]).map((av) => (
                <Button
                  key={av}
                  variant={availability === av ? "default" : "outline"}
                  size="sm"
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    setAvailability(av);
                    statusMutation.mutate(av);
                  }}
                >
                  {statusLabel(av)}
                </Button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={claimMutation.isPending || availability !== "available"}
              onClick={() => claimMutation.mutate()}
            >
              <Inbox className="mr-2 size-4" />
              Claim next chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {ringing.length > 0 ? (
              <div className="mb-4 space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Incoming
                </h2>
                {ringing.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className="w-full rounded-2xl border border-primary/30 bg-primary/10 p-3 text-left transition-colors hover:bg-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{chat.clientAlias}</span>
                      <span className="text-xs text-muted-foreground">Ringing</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptMutation.mutate(chat.id);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          declineMutation.mutate(chat.id);
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {open.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active chats
                </h2>
                {open.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      selectedChatId === chat.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{chat.clientAlias}</span>
                      {chat.clientAway ? (
                        <span className="text-xs text-amber-500">Away</span>
                      ) : (
                        <span className="text-xs text-green-500">Active</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {chat.startedAt ? new Date(chat.startedAt).toLocaleTimeString() : "—"}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No active chats. Stay available to receive incoming requests.
              </p>
            )}
          </div>
        </aside>

        <section className="hidden flex-1 flex-col sm:flex">
          {activeChat ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div>
                  <p className="font-medium">{activeChat.clientAlias}</p>
                  <p className="text-xs text-muted-foreground">{activeChat.profileName}</p>
                </div>
                <Button variant="outline" onClick={() => setShowEndConfirm(true)}>
                  Chat afsluiten
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AgentChatPanel enabled={!!selectedChatId} />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MessageCircle className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm">Select or claim a chat to start helping.</p>
            </div>
          )}
        </section>
      </div>

      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Chat afsluiten?</DialogTitle>
            <DialogDescription>
              Deze actie beëindigt het gesprek en maakt jou direct beschikbaar voor een nieuwe
              aanvraag.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={closeMutation.isPending}
              onClick={() => selectedChatId && closeMutation.mutate(selectedChatId)}
            >
              Ja, afsluiten
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowEndConfirm(false)}>
              Annuleren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile chat overlay */}
      {selectedChatId && activeChat && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background sm:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-medium">{activeChat.clientAlias}</p>
              <p className="text-xs text-muted-foreground">{activeChat.profileName}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEndConfirm(true)}>
                Afsluiten
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedChatId(null)}>
                Back
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <AgentChatPanel enabled={!!selectedChatId} />
          </div>
        </div>
      )}
    </main>
  );
}
