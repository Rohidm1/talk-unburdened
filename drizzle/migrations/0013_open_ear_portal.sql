CREATE TABLE public.staff_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_announcements TO authenticated;
GRANT ALL ON public.staff_announcements TO service_role;
ALTER TABLE public.staff_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read announcements" ON public.staff_announcements
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.call_notes ADD COLUMN IF NOT EXISTS category text;

CREATE OR REPLACE FUNCTION public.assign_chat_agent(_listener_id uuid, _client_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE chosen uuid;
BEGIN
  -- Returning customers keep their previous agent when that agent is Online with a free slot.
  SELECT r.agent_user_id INTO chosen
  FROM public.client_agent_routes r
  JOIN public.agent_presence p ON p.user_id = r.agent_user_id
  WHERE r.client_id = _client_id
    AND r.listener_id = _listener_id
    AND p.availability = 'available'
    AND p.last_seen_at > now() - interval '60 seconds'
    AND COALESCE(p.active_chat_count, 0) < 2
  LIMIT 1;
  IF chosen IS NOT NULL THEN RETURN chosen; END IF;

  -- Otherwise a random Online agent with fewer than 2 open chats.
  SELECT p.user_id INTO chosen
  FROM public.agent_presence p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'staff'
  WHERE p.availability = 'available'
    AND p.last_seen_at > now() - interval '60 seconds'
    AND COALESCE(p.active_chat_count, 0) < 2
  ORDER BY random()
  LIMIT 1;

  RETURN chosen;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_next_chat(_agent_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE picked uuid; open_count int;
BEGIN
  SELECT count(*) INTO open_count FROM public.chat_sessions
  WHERE agent_user_id = _agent_user_id AND ended_at IS NULL;
  IF open_count >= 2 THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agent_presence WHERE user_id = _agent_user_id AND availability = 'available') THEN
    RETURN NULL;
  END IF;

  UPDATE public.chat_sessions s
  SET agent_user_id = _agent_user_id, status = 'active', answered_at = now()
  WHERE s.id = (
    SELECT id FROM public.chat_sessions
    WHERE agent_user_id IS NULL AND ended_at IS NULL AND status IN ('queued', 'ringing')
      AND last_heartbeat_at > now() - interval '60 seconds'
    ORDER BY started_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING s.id INTO picked;
  RETURN picked;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.assign_chat_agent(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_next_chat(uuid) FROM PUBLIC, anon, authenticated;