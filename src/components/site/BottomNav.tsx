import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Users, Waves, Zap, MessageCircle, Leaf } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { markSeen, useBadges } from "@/hooks/useBadges";
import { haptic } from "@/lib/native";

type Item = { to: "/" | "/community" | "/bottles" | "/speed-chat" | "/wellness"; label: string; icon: LucideIcon; badge?: "chat" | "bottles"; chat?: true };

const ITEMS: Item[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/bottles", label: "Bottles", icon: Waves, badge: "bottles" },
  { to: "/", label: "Chat", icon: MessageCircle, badge: "chat", chat: true },
  { to: "/speed-chat", label: "Speed", icon: Zap },
  { to: "/wellness", label: "Wellness", icon: Leaf },
];

const HIDDEN_PREFIXES = ["/crm", "/staff", "/admin", "/auth", "/checkout"];

/** Android-style fixed bottom navigation, shown on phones and small tablets only. */
export function BottomNav() {
  const location = useRouterState({ select: (s) => s.location });
  const { user } = useAuth();
  const badges = useBadges(user?.id ?? null);
  const path = location.pathname;
  const chatOpen = (location.search as { chat?: unknown }).chat !== undefined;

  if (HIDDEN_PREFIXES.some((p) => path.startsWith(p))) return null;

  return (
    <nav
      aria-label="Main"
      className="bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-6">
        {ITEMS.map((item) => {
          const active = item.chat ? path === "/" && chatOpen : item.to === "/" ? path === "/" && !chatOpen : path.startsWith(item.to);
          const count = item.badge ? badges[item.badge] : 0;
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                search={item.chat ? { chat: 1 as const } : {}}
                onClick={() => {
                  haptic(8);
                  if (item.badge) markSeen(item.badge);
                }}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 min-w-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className={`relative grid size-8 place-items-center rounded-full ${active ? "bg-primary/15" : ""}`}>
                  <Icon className="size-5" aria-hidden />
                  {count > 0 ? (
                    <span className="absolute -top-1 -right-2 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground">
                      {count > 9 ? "9+" : count}
                      <span className="sr-only"> new</span>
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
