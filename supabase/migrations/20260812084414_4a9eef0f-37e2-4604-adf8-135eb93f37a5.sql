CREATE TABLE public.engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text NOT NULL,
  mood text,
  depth text,
  session_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX engagement_events_created_idx ON public.engagement_events (created_at DESC);
CREATE INDEX engagement_events_event_idx ON public.engagement_events (event);

GRANT INSERT ON public.engagement_events TO anon, authenticated;
GRANT SELECT ON public.engagement_events TO authenticated;
GRANT ALL ON public.engagement_events TO service_role;

ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can record engagement events"
  ON public.engagement_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read engagement events"
  ON public.engagement_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));