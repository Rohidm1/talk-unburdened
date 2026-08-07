CREATE TABLE public.agent_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.listener_status NOT NULL DEFAULT 'offline',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_presence TO authenticated;
GRANT ALL ON public.agent_presence TO service_role;
ALTER TABLE public.agent_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Presence readable by self or admin" ON public.agent_presence
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER agent_presence_touch BEFORE UPDATE ON public.agent_presence
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.listener_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id uuid NOT NULL REFERENCES public.listeners(id) ON DELETE CASCADE,
  agent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listener_id, agent_user_id)
);
GRANT SELECT ON public.listener_agents TO authenticated;
GRANT ALL ON public.listener_agents TO service_role;
ALTER TABLE public.listener_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agent links readable by agent or admin" ON public.listener_agents
  FOR SELECT TO authenticated
  USING (auth.uid() = agent_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.client_agent_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listener_id uuid NOT NULL REFERENCES public.listeners(id) ON DELETE CASCADE,
  agent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, listener_id)
);
GRANT SELECT ON public.client_agent_routes TO authenticated;
GRANT ALL ON public.client_agent_routes TO service_role;
ALTER TABLE public.client_agent_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own preferred agents" ON public.client_agent_routes
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER client_agent_routes_touch BEFORE UPDATE ON public.client_agent_routes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Carry over the existing one-agent-per-profile links and statuses.
INSERT INTO public.listener_agents (listener_id, agent_user_id)
SELECT id, user_id FROM public.listeners WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_presence (user_id, status)
SELECT DISTINCT ON (user_id) user_id, status FROM public.listeners WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_listener_status(_listener_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.listeners l
  SET status = COALESCE((
    SELECT CASE
      WHEN bool_or(p.status = 'online') THEN 'online'
      WHEN bool_or(p.status = 'busy') THEN 'busy'
      ELSE 'offline'
    END::public.listener_status
    FROM public.listener_agents la
    JOIN public.agent_presence p ON p.user_id = la.agent_user_id
    WHERE la.listener_id = l.id
  ), 'offline'::public.listener_status)
  WHERE l.id = _listener_id;
$$;

CREATE OR REPLACE FUNCTION public.set_agent_status(_agent_user_id uuid, _status public.listener_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  INSERT INTO public.agent_presence (user_id, status, last_seen_at)
  VALUES (_agent_user_id, _status, now())
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, last_seen_at = now();

  FOR r IN SELECT listener_id FROM public.listener_agents WHERE agent_user_id = _agent_user_id LOOP
    PERFORM public.sync_listener_status(r.listener_id);
  END LOOP;
END;
$$;