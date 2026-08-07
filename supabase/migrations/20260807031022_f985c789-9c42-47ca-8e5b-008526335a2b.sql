ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS answered_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ringing';

UPDATE public.calls SET answered_at = started_at WHERE answered_at IS NULL AND ended_at IS NOT NULL;
UPDATE public.calls SET status = 'ended' WHERE ended_at IS NOT NULL;

ALTER TABLE public.call_notes
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS call_notes_client_idx ON public.call_notes (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calls_client_idx ON public.calls (client_id, started_at DESC);

CREATE OR REPLACE FUNCTION public.settle_call(_call_id uuid, _rate_cents integer, _end_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(billed integer, cost integer, free_left integer, paid_left integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.calls%ROWTYPE;
  p public.profiles%ROWTYPE;
  ends_at timestamptz;
  elapsed integer;
  allowance integer;
  total integer;
  free_used integer;
  paid_used integer;
  cost_cents integer;
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

  ends_at := COALESCE(_end_at, now());

  -- Never accepted by an agent: nothing is billed.
  IF c.answered_at IS NULL THEN
    UPDATE public.calls
    SET ended_at = ends_at,
        duration_seconds = 0,
        free_seconds_used = 0,
        billed_seconds = 0,
        cost_cents = 0,
        status = CASE WHEN c.status = 'declined' THEN 'declined' ELSE 'missed' END
    WHERE id = _call_id;

    RETURN QUERY SELECT 0, 0, COALESCE(p.free_seconds_remaining, 0), COALESCE(p.credit_seconds, 0);
    RETURN;
  END IF;

  elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (ends_at - c.answered_at)))::integer);

  IF c.mode = 'free' THEN
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
  WHERE id = c.client_id;

  UPDATE public.calls
  SET ended_at = ends_at,
      duration_seconds = elapsed,
      free_seconds_used = free_used,
      billed_seconds = total,
      cost_cents = cost_cents,
      status = 'ended'
  WHERE id = _call_id;

  IF total > 0 THEN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, amount_cents, kind)
    VALUES (c.client_id, -total, cost_cents, 'usage');
  END IF;

  RETURN QUERY
    SELECT total, cost_cents,
           COALESCE(p.free_seconds_remaining, 0) - free_used,
           COALESCE(p.credit_seconds, 0) - paid_used;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_stale_calls(_user_id uuid, _rate_cents integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id, last_heartbeat_at FROM public.calls
    WHERE client_id = _user_id AND ended_at IS NULL AND last_heartbeat_at < now() - interval '45 seconds'
  LOOP
    PERFORM public.settle_call(r.id, _rate_cents, r.last_heartbeat_at);
  END LOOP;
END;
$function$;