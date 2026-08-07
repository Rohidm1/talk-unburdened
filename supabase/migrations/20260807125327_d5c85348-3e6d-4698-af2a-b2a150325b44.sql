CREATE OR REPLACE FUNCTION public.settle_chat(_session_id uuid, _rate_cents integer, _end_at timestamptz DEFAULT NULL)
RETURNS TABLE(billed integer, cost integer, free_left integer, paid_left integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.chat_sessions%ROWTYPE;
  p public.profiles%ROWTYPE;
  v_ends_at timestamptz;
  v_elapsed integer;
  v_allowance integer;
  v_total integer;
  v_free_used integer;
  v_paid_used integer;
  v_cost integer;
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

  v_ends_at := COALESCE(_end_at, now());

  IF s.answered_at IS NULL THEN
    UPDATE public.chat_sessions
    SET ended_at = v_ends_at, duration_seconds = 0, free_seconds_used = 0,
        billed_seconds = 0, cost_cents = 0, status = 'ended'
    WHERE id = _session_id;
    RETURN QUERY SELECT 0, 0, COALESCE(p.free_seconds_remaining, 0), COALESCE(p.credit_seconds, 0);
    RETURN;
  END IF;

  v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_ends_at - s.answered_at)))::integer);

  IF s.mode = 'free' THEN
    v_allowance := LEAST(COALESCE(p.free_seconds_remaining, 0), 300);
  ELSE
    v_allowance := COALESCE(p.free_seconds_remaining, 0) + COALESCE(p.credit_seconds, 0);
  END IF;

  v_total := LEAST(v_elapsed, v_allowance);
  v_free_used := LEAST(v_total, COALESCE(p.free_seconds_remaining, 0));
  v_paid_used := v_total - v_free_used;
  v_cost := ROUND(v_paid_used::numeric / 60 * _rate_cents);

  UPDATE public.profiles
  SET free_seconds_remaining = free_seconds_remaining - v_free_used,
      credit_seconds = credit_seconds - v_paid_used
  WHERE id = s.client_id;

  UPDATE public.chat_sessions
  SET ended_at = v_ends_at, duration_seconds = v_elapsed, free_seconds_used = v_free_used,
      billed_seconds = v_total, cost_cents = v_cost, status = 'ended'
  WHERE id = _session_id;

  IF v_total > 0 THEN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, amount_cents, kind)
    VALUES (s.client_id, -v_total, v_cost, 'chat_usage');
  END IF;

  RETURN QUERY
    SELECT v_total, v_cost,
           COALESCE(p.free_seconds_remaining, 0) - v_free_used,
           COALESCE(p.credit_seconds, 0) - v_paid_used;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_call(_call_id uuid, _rate_cents integer, _end_at timestamptz DEFAULT NULL)
RETURNS TABLE(billed integer, cost integer, free_left integer, paid_left integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.calls%ROWTYPE;
  p public.profiles%ROWTYPE;
  v_ends_at timestamptz;
  v_elapsed integer;
  v_allowance integer;
  v_total integer;
  v_free_used integer;
  v_paid_used integer;
  v_cost integer;
BEGIN
  SELECT * INTO c FROM public.calls WHERE id = _call_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = c.client_id FOR UPDATE;

  IF c.ended_at IS NOT NULL THEN
    RETURN QUERY SELECT c.billed_seconds, c.cost_cents,
                        COALESCE(p.free_seconds_remaining, 0), COALESCE(p.credit_seconds, 0);
    RETURN;
  END IF;

  v_ends_at := COALESCE(_end_at, now());

  IF c.answered_at IS NULL THEN
    UPDATE public.calls
    SET ended_at = v_ends_at, duration_seconds = 0, free_seconds_used = 0,
        billed_seconds = 0, cost_cents = 0,
        status = CASE WHEN c.status = 'declined' THEN 'declined' ELSE 'missed' END
    WHERE id = _call_id;
    RETURN QUERY SELECT 0, 0, COALESCE(p.free_seconds_remaining, 0), COALESCE(p.credit_seconds, 0);
    RETURN;
  END IF;

  v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_ends_at - c.answered_at)))::integer);

  IF c.mode = 'free' THEN
    v_allowance := LEAST(COALESCE(p.free_seconds_remaining, 0), 300);
  ELSE
    v_allowance := COALESCE(p.free_seconds_remaining, 0) + COALESCE(p.credit_seconds, 0);
  END IF;

  v_total := LEAST(v_elapsed, v_allowance);
  v_free_used := LEAST(v_total, COALESCE(p.free_seconds_remaining, 0));
  v_paid_used := v_total - v_free_used;
  v_cost := ROUND(v_paid_used::numeric / 60 * _rate_cents);

  UPDATE public.profiles
  SET free_seconds_remaining = free_seconds_remaining - v_free_used,
      credit_seconds = credit_seconds - v_paid_used
  WHERE id = c.client_id;

  UPDATE public.calls
  SET ended_at = v_ends_at, duration_seconds = v_elapsed, free_seconds_used = v_free_used,
      billed_seconds = v_total, cost_cents = v_cost, status = 'ended'
  WHERE id = _call_id;

  IF v_total > 0 THEN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, amount_cents, kind)
    VALUES (c.client_id, -v_total, v_cost, 'usage');
  END IF;

  RETURN QUERY
    SELECT v_total, v_cost,
           COALESCE(p.free_seconds_remaining, 0) - v_free_used,
           COALESCE(p.credit_seconds, 0) - v_paid_used;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settle_chat(uuid, integer, timestamptz) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamptz) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.settle_chat(uuid, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamptz) TO service_role;