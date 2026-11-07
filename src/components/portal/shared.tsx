export function formatStamp(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const labels = { available: "Online", break: "Break", offline: "Offline" } as const;

export function StatusPill({ status }: { status: "available" | "break" | "offline" }) {
  const tone =
    status === "available"
      ? "border-success/50 bg-success/15 text-success"
      : status === "break"
        ? "border-warning/50 bg-warning/15 text-warning"
        : "border-border bg-secondary text-muted-foreground";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>{labels[status]}</span>
  );
}

export function Transcript({
  messages,
}: {
  messages: { id: string; sender_role: string; body: string; created_at: string }[];
}) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">No messages yet.</p>;
  }
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={`flex flex-col ${m.sender_role === "agent" ? "items-end" : "items-start"}`}>
          <div
            className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${
              m.sender_role === "agent"
                ? "rounded-br-none bg-primary text-primary-foreground"
                : "rounded-bl-none border border-border bg-secondary"
            }`}
          >
            {m.body}
          </div>
          <span className="mt-1 px-1 text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
