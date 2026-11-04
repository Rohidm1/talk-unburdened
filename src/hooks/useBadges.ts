import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { alertUser } from "@/lib/native";

type BadgeKind = "chat" | "bottles";
const seenKey = (k: BadgeKind) => `at.seen.${k}`;

function lastSeen(k: BadgeKind): string {
  const v = window.localStorage.getItem(seenKey(k));
  if (v) return v;
  const now = new Date().toISOString();
  window.localStorage.setItem(seenKey(k), now);
  return now;
}

/** Clears a badge (call when the user opens the chat or the bottles page). */
export function markSeen(k: BadgeKind) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(seenKey(k), new Date().toISOString());
  window.dispatchEvent(new CustomEvent("at:seen", { detail: k }));
}

/**
 * Unread partner replies and new replies to your bottles, polled every 30s.
 * New items trigger sound, vibration and a system notification.
 */
export function useBadges(userId: string | null) {
  const [counts, setCounts] = useState({ chat: 0, bottles: 0 });
  const prev = useRef({ chat: 0, bottles: 0 });

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [chat, bottles] = await Promise.all([
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
    ]);
    const next = { chat: chat.count ?? 0, bottles: bottles.count ?? 0 };
    if (next.chat > prev.current.chat) {
      alertUser({ title: "New message", body: "Your chat partner replied.", url: "/?chat=1", tag: "chat" });
    }
    if (next.bottles > prev.current.bottles) {
      alertUser({ title: "A bottle washed back", body: "Someone replied to your bottle.", url: "/bottles", sound: "match", tag: "bottles" });
    }
    prev.current = next;
    setCounts(next);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCounts({ chat: 0, bottles: 0 });
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
