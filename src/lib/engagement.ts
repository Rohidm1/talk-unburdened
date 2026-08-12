import { supabase } from "@/integrations/supabase/client";

export type EngagementEvent =
  | "mood_selected"
  | "depth_selected"
  | "match_started"
  | "match_skipped"
  | "icebreaker_dice"
  | "quiz_answered"
  | "mystery_box_unlocked"
  | "bonus_claimed"
  | "compliment_sent";

/** Fire-and-forget engagement telemetry used by the admin analytics tab. */
export function logEngagement(
  event: EngagementEvent,
  extra: { mood?: string | null; depth?: string | null; sessionId?: string | null; detail?: Record<string, unknown> } = {},
) {
  if (typeof window === "undefined") return;
  void supabase.auth.getUser().then(({ data }) =>
    supabase.from("engagement_events").insert({
      user_id: data.user?.id ?? null,
      event,
      mood: extra.mood ?? null,
      depth: extra.depth ?? null,
      session_id: extra.sessionId ?? null,
      detail: (extra.detail ?? {}) as never,
    }),
  );
}