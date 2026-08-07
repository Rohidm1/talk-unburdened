CREATE TABLE public.chat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  event text NOT NULL,
  actor_role text NOT NULL DEFAULT 'system',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_events_session_idx ON public.chat_events (session_id, created_at);

GRANT SELECT ON public.chat_events TO authenticated;
GRANT ALL ON public.chat_events TO service_role;

ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat events readable by participants or admin"
ON public.chat_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions s
  WHERE s.id = chat_events.session_id
    AND (auth.uid() = s.client_id OR auth.uid() = s.agent_user_id OR public.has_role(auth.uid(), 'admin'))
));

CREATE OR REPLACE FUNCTION public.sync_listener_status(_listener_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.listeners l
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.calls c
      WHERE c.listener_id = l.id AND c.ended_at IS NULL AND c.status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.listener_id = l.id AND s.ended_at IS NULL AND s.status = 'active'
    ) THEN 'busy'::public.listener_status
    WHEN EXISTS (
      SELECT 1
      FROM public.listener_agents la
      JOIN public.agent_presence p ON p.user_id = la.agent_user_id
      WHERE la.listener_id = l.id AND p.status IN ('online','busy')
    ) THEN 'online'::public.listener_status
    ELSE 'offline'::public.listener_status
  END
  WHERE l.id = _listener_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_listener_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_listener_status(uuid) TO service_role;