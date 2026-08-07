-- 1. Chat sessions
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listener_id uuid NOT NULL REFERENCES public.listeners(id) ON DELETE CASCADE,
  agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ringing',
  mode text NOT NULL DEFAULT 'paid',
  started_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0,
  free_seconds_used integer NOT NULL DEFAULT 0,
  billed_seconds integer NOT NULL DEFAULT 0,
  cost_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat sessions visible to participants or admin"
ON public.chat_sessions FOR SELECT TO authenticated
USING (
  auth.uid() = client_id
  OR auth.uid() = agent_user_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE INDEX idx_chat_sessions_client ON public.chat_sessions(client_id);
CREATE INDEX idx_chat_sessions_agent ON public.chat_sessions(agent_user_id);
CREATE INDEX idx_chat_sessions_open ON public.chat_sessions(status) WHERE ended_at IS NULL;

CREATE TRIGGER chat_sessions_touch
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat messages readable by participants or admin"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id
      AND (auth.uid() = s.client_id OR auth.uid() = s.agent_user_id OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Chat messages writable by participants of an active session"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id
      AND s.ended_at IS NULL
      AND s.status = 'active'
      AND (
        (sender_role = 'client' AND auth.uid() = s.client_id)
        OR (sender_role = 'agent' AND auth.uid() = s.agent_user_id)
      )
  )
);

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);

-- 3. Monitor log
CREATE TABLE public.call_monitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.call_monitor_sessions TO authenticated;
GRANT ALL ON public.call_monitor_sessions TO service_role;
ALTER TABLE public.call_monitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Monitor log readable by admin"
ON public.call_monitor_sessions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Extra columns
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS conference_name text;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS agent_call_sid text;
ALTER TABLE public.agent_presence ADD COLUMN IF NOT EXISTS active_chat_count integer NOT NULL DEFAULT 0;

-- 5. Keep active_chat_count in sync
CREATE OR REPLACE FUNCTION public.sync_agent_chat_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.agent_user_id, OLD.agent_user_id);
  IF target IS NOT NULL THEN
    UPDATE public.agent_presence
    SET active_chat_count = (
      SELECT count(*) FROM public.chat_sessions
      WHERE agent_user_id = target AND ended_at IS NULL AND status IN ('ringing', 'active')
    )
    WHERE user_id = target;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.agent_user_id IS DISTINCT FROM NEW.agent_user_id AND OLD.agent_user_id IS NOT NULL THEN
    UPDATE public.agent_presence
    SET active_chat_count = (
      SELECT count(*) FROM public.chat_sessions
      WHERE agent_user_id = OLD.agent_user_id AND ended_at IS NULL AND status IN ('ringing', 'active')
    )
    WHERE user_id = OLD.agent_user_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER chat_sessions_agent_count
AFTER INSERT OR UPDATE OR DELETE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_agent_chat_count();

-- 6. Settle a chat session against the shared credit pool
CREATE OR REPLACE FUNCTION public.settle_chat(
  _session_id uuid,
  _rate_cents integer,
  _end_at timestamptz DEFAULT NULL
)
RETURNS TABLE(billed integer, cost integer, free_left integer, paid_left integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.chat_sessions%ROWTYPE;
  p public.profiles%ROWTYPE;
  ends_at timestamptz;
  elapsed integer;
  allowance integer;
  total integer;
  free_used integer;
  paid_used integer;
  cost_cents integer;
BEGIN
  SELECT * INTO s FROM public.chat_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = s.client_id FOR UPDATE;

  IF s.ended_at IS NOT NULL THEN
    RETURN QUERY SELECT s.billed_seconds, s.cost_cents,
                        COALESCE(p.free_seconds_remaining, 0), COALESCE(p.credit_seconds, 0);
    RETURN;
  END IF;

  ends_at := COALESCE(_end_at, now());

  IF s.answered_at IS NULL THEN
    UPDATE public.chat_sessions
    SET ended_at = ends_at, duration_seconds = 0, free_seconds_used = 0,
        billed_seconds = 0, cost_cents = 0,
        status = 'ended'
    WHERE id = _session_id;
    RETURN QUERY SELECT 0, 0, COALESCE(p.free_seconds_remaining, 0), COALESCE(p.credit_seconds, 0);
    RETURN;
  END IF;

  elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (ends_at - s.answered_at)))::integer);

  IF s.mode = 'free' THEN
    allowance := LEAST(COALESCE(p.free_seconds_remaining, 0), 300);
  ELSE
    allowance := COALESCE(p.free_seconds_remaining, 0) + COALESCE(p.credit_seconds, 0);
  END IF;

  total := LEAST(elapsed, allowance);
  free_used := LEAST(total, COALESCE(p.free_seconds_remaining, 0));
  paid_used := total - free_used;
  cost_cents := ROUND(paid_used::numeric / 60 * _rate_cents);

  UPDATE public.profiles
  SET free_seconds_remaining = free_seconds_remaining - free_used,
      credit_seconds = credit_seconds - paid_used
  WHERE id = s.client_id;

  UPDATE public.chat_sessions
  SET ended_at = ends_at, duration_seconds = elapsed, free_seconds_used = free_used,
      billed_seconds = total, cost_cents = cost_cents, status = 'ended'
  WHERE id = _session_id;

  IF total > 0 THEN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, amount_cents, kind)
    VALUES (s.client_id, -total, cost_cents, 'chat_usage');
  END IF;

  RETURN QUERY
    SELECT total, cost_cents,
           COALESCE(p.free_seconds_remaining, 0) - free_used,
           COALESCE(p.credit_seconds, 0) - paid_used;
END;
$$;

-- 7. Clean up stale chats
CREATE OR REPLACE FUNCTION public.settle_stale_chats(_user_id uuid, _rate_cents integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id, last_heartbeat_at FROM public.chat_sessions
    WHERE client_id = _user_id AND ended_at IS NULL
      AND last_heartbeat_at < now() - interval '45 seconds'
  LOOP
    PERFORM public.settle_chat(r.id, _rate_cents, r.last_heartbeat_at);
  END LOOP;
END;
$$;

-- 8. Pick an agent for a new chat: sticky first, then least-loaded online agent (< 2 chats)
CREATE OR REPLACE FUNCTION public.assign_chat_agent(_listener_id uuid, _client_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE chosen uuid;
BEGIN
  SELECT la.agent_user_id INTO chosen
  FROM public.client_agent_routes r
  JOIN public.listener_agents la
    ON la.listener_id = r.listener_id AND la.agent_user_id = r.agent_user_id
  JOIN public.agent_presence p ON p.user_id = la.agent_user_id
  WHERE r.client_id = _client_id
    AND r.listener_id = _listener_id
    AND p.status = 'online'
    AND p.last_seen_at > now() - interval '60 seconds'
    AND COALESCE(p.active_chat_count, 0) < 2
  LIMIT 1;

  IF chosen IS NOT NULL THEN
    RETURN chosen;
  END IF;

  SELECT la.agent_user_id INTO chosen
  FROM public.listener_agents la
  JOIN public.agent_presence p ON p.user_id = la.agent_user_id
  WHERE la.listener_id = _listener_id
    AND p.status = 'online'
    AND p.last_seen_at > now() - interval '60 seconds'
    AND COALESCE(p.active_chat_count, 0) < 2
  ORDER BY COALESCE(p.active_chat_count, 0) ASC, p.last_seen_at DESC
  LIMIT 1;

  RETURN chosen;
END;
$$;

-- 9. Lock down the new privileged functions (server-only)
REVOKE EXECUTE ON FUNCTION public.settle_chat(uuid, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_stale_chats(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_chat_agent(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_agent_chat_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_chat(uuid, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_stale_chats(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_chat_agent(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_agent_chat_count() TO service_role;

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;