CREATE OR REPLACE FUNCTION public.settle_stale_agent_chats(_agent_user_id uuid, _rate_cents integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  -- Answered chats where the customer stopped sending heartbeats.
  FOR r IN
    SELECT id, last_heartbeat_at FROM public.chat_sessions
    WHERE agent_user_id = _agent_user_id AND ended_at IS NULL
      AND last_heartbeat_at < now() - interval '45 seconds'
  LOOP
    PERFORM public.settle_chat(r.id, _rate_cents, r.last_heartbeat_at);
  END LOOP;

  -- Requests nobody accepted and the customer already walked away from.
  UPDATE public.chat_sessions
  SET status = 'ended', ended_at = now()
  WHERE agent_user_id = _agent_user_id
    AND ended_at IS NULL
    AND answered_at IS NULL
    AND last_heartbeat_at < now() - interval '45 seconds';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.settle_stale_agent_chats(uuid, integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.settle_stale_agent_chats(uuid, integer) TO service_role;