DROP POLICY IF EXISTS "anyone can record engagement events" ON public.engagement_events;
CREATE POLICY "visitors record own engagement events" ON public.engagement_events
FOR INSERT TO anon, authenticated
WITH CHECK (
  ((auth.uid() IS NULL AND user_id IS NULL) OR user_id = auth.uid())
  AND event IN ('mood_selected','depth_selected','match_started','match_skipped','icebreaker_dice','quiz_answered','mystery_box_unlocked','bonus_claimed','compliment_sent','fab_clicked','session_milestone','daily_checkin')
  AND char_length(coalesce(mood,'')) <= 50
  AND char_length(coalesce(depth,'')) <= 50
  AND pg_column_size(detail) <= 2048
);