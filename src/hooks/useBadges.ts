import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { alertUser } from "@/lib/native";

export type BadgeKind = "chat" | "bottles" | "community" | "buddies";
type Counts = Record<BadgeKind, number>;
const EMPTY: Counts = { chat: 0, bottles: 0, community: 0, buddies: 0 };
const seenKey = (k: BadgeKind) => `at.seen.${k}`;

function lastSeen(k: BadgeKind): string {
  const v = window.localStorage.getItem(seenKey(k));
  if (v) return v;
  const now = new Date().toISOString();
  window.localStorage.setItem(seenKey(k), now);
  return now;
}

/** Clears a badge (call when the user opens the matching screen). */
export function markSeen(k: BadgeKind) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(seenKey(k), new Date().toISOString());
  window.dispatchEvent(new CustomEvent("at:seen", { detail: k }));
}

/**
 * Unread partner replies, bottle replies, community replies and buddy notes,
 * polled every 30s. New items trigger sound, vibration and a notification
 * (each kind can be switched off in App settings).
 */
export function useBadges(userId: string | null) {
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const prev = useRef<Counts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [chat, bottles, community, buddies] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("id, chat_sessions!inner(client_id)", { count: "exact", head: true })
        .eq("chat_sessions.client_id", userId)
        .neq("sender_role", "client")
        .gt("created_at", lastSeen("chat")),
      supabase
        .from("bottle_echoes")
        .select("id, bottles!inner(user_id)", { count: "exact", head: true })
        .eq("bottles.user_id", userId)
        .neq("user_id", userId)
        .gt("created_at", lastSeen("bottles")),
      supabase
        .from("community_posts")
        .select("id, parent:parent_id!inner(user_id)", { count: "exact", head: true })
        .eq("parent.user_id", userId)
        .neq("user_id", userId)
        .gt("created_at", lastSeen("community")),
      supabase
        .from("buddy_notes")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId)
        .gt("created_at", lastSeen("buddies")),
    ]);
    const next: Counts = {
      chat: chat.count ?? 0,
      bottles: bottles.count ?? 0,
      community: community.count ?? 0,
      buddies: buddies.count ?? 0,
    };
    const p = prev.current;
    if (next.chat > p.chat) alertUser({ title: "New message", body: "Your chat partner replied.", url: "/?chat=1", tag: "chat", kind: "chat" });
    if (next.bottles > p.bottles) alertUser({ title: "A bottle washed back", body: "Someone replied to your bottle.", url: "/bottles", sound: "match", tag: "bottles", kind: "bottles" });
    if (next.community > p.community) alertUser({ title: "New reply", body: "Someone replied to you in the community.", url: "/community", tag: "community", kind: "community" });
    if (next.buddies > p.buddies) alertUser({ title: "A note from your buddy", body: "Someone is thinking of you.", url: "/buddies", sound: "match", tag: "buddies", kind: "buddies" });
    prev.current = next;
    setCounts(next);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCounts(EMPTY);
      return;
    }
    void refresh();
    const t = window.setInterval(() => void refresh(), 30_000);
    const onSeen = () => void refresh();
    window.addEventListener("at:seen", onSeen);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("at:seen", onSeen);
    };
  }, [userId, refresh]);

  return counts;
}
