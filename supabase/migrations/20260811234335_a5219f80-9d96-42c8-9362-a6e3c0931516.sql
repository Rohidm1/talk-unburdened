-- 1. Restrict has_role so signed-in users can only check their OWN roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN current_user IN ('service_role','postgres','supabase_admin')
      OR _user_id = auth.uid()
    THEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    ELSE false
  END;
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 2. Explicit admin-only write policies (server RPCs use service_role and bypass RLS)
DROP POLICY IF EXISTS "Admins manage agent presence" ON public.agent_presence;
CREATE POLICY "Admins manage agent presence" ON public.agent_presence
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage client agent routes" ON public.client_agent_routes;
CREATE POLICY "Admins manage client agent routes" ON public.client_agent_routes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage listener agents" ON public.listener_agents;
CREATE POLICY "Admins manage listener agents" ON public.listener_agents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_presence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_agent_routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listener_agents TO authenticated;
GRANT ALL ON public.agent_presence TO service_role;
GRANT ALL ON public.client_agent_routes TO service_role;
GRANT ALL ON public.listener_agents TO service_role;