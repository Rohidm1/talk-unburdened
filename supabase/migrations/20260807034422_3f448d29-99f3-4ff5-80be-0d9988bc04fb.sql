REVOKE EXECUTE ON FUNCTION public.grant_credits(uuid, integer, integer, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.revoke_credits(uuid, integer, integer, text, text, boolean) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamptz) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.settle_stale_calls(uuid, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_agent_status(uuid, public.listener_status) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_listener_status(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_protected_columns() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_credits(uuid, integer, integer, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_stale_calls(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_agent_status(uuid, public.listener_status) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_listener_status(uuid) TO service_role;