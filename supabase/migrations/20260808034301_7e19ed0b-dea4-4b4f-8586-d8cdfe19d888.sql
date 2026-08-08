CREATE TABLE IF NOT EXISTS public.agent_shift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  availability text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_shift_events TO authenticated;
GRANT ALL ON public.agent_shift_events TO service_role;

ALTER TABLE public.agent_shift_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shift log readable by self or admin"
ON public.agent_shift_events FOR SELECT TO authenticated
USING (auth.uid() = agent_user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS agent_shift_events_agent_time_idx
  ON public.agent_shift_events (agent_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_agent_availability(_agent_user_id uuid, _availability text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE prev text;
BEGIN
  IF _availability NOT IN ('available', 'break', 'offline') THEN
    RAISE EXCEPTION 'invalid availability';
  END IF;

  SELECT availability INTO prev FROM public.agent_presence WHERE user_id = _agent_user_id;

  INSERT INTO public.agent_presence (user_id, status, availability, last_seen_at, online_since)
  VALUES (
    _agent_user_id,
    CASE WHEN _availability = 'offline' THEN 'offline'::public.listener_status ELSE 'online'::public.listener_status END,
    _availability,
    now(),
    CASE WHEN _availability = 'offline' THEN NULL ELSE now() END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = CASE WHEN _availability = 'offline' THEN 'offline'::public.listener_status ELSE 'online'::public.listener_status END,
    availability = _availability,
    last_seen_at = now(),
    online_since = CASE
      WHEN _availability = 'offline' THEN NULL
      WHEN public.agent_presence.online_since IS NULL THEN now()
      ELSE public.agent_presence.online_since END;

  IF prev IS DISTINCT FROM _availability THEN
    INSERT INTO public.agent_shift_events (agent_user_id, availability)
    VALUES (_agent_user_id, _availability);
  END IF;
END;
$function$;