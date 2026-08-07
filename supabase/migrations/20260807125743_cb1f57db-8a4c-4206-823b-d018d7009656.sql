CREATE OR REPLACE FUNCTION public.sync_listener_status(_listener_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  UPDATE public.listeners l
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.calls c
      WHERE c.listener_id = l.id AND c.ended_at IS NULL AND c.status = 'active'
        AND c.last_heartbeat_at > now() - interval '45 seconds'
    ) OR EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.listener_id = l.id AND s.ended_at IS NULL AND s.status = 'active'
        AND s.last_heartbeat_at > now() - interval '45 seconds'
    ) THEN 'busy'::public.listener_status
    WHEN EXISTS (
      SELECT 1
      FROM public.listener_agents la
      JOIN public.agent_presence p ON p.user_id = la.agent_user_id
      WHERE la.listener_id = l.id AND p.status IN ('online','busy')
        AND p.last_seen_at > now() - interval '90 seconds'
    ) THEN 'online'::public.listener_status
    ELSE 'offline'::public.listener_status
  END
  WHERE l.id = _listener_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_listener_status(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.sync_listener_status(uuid) TO service_role;