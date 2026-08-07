REVOKE EXECUTE ON FUNCTION public.sync_listener_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_agent_status(uuid, public.listener_status) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_listener_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_agent_status(uuid, public.listener_status) TO service_role;