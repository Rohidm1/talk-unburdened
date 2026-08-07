REVOKE EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_stale_calls(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_stale_calls(uuid, integer) TO service_role;