-- 1. Split free trial time from purchased credits + add block flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_seconds_remaining integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET free_seconds_remaining = LEAST(credit_seconds, 180),
    credit_seconds = GREATEST(credit_seconds - LEAST(credit_seconds, 180), 0);

-- 2. Prevent users from editing their own balance / block flag
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    IF NEW.credit_seconds IS DISTINCT FROM OLD.credit_seconds
       OR NEW.free_seconds_remaining IS DISTINCT FROM OLD.free_seconds_remaining
       OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
      RAISE EXCEPTION 'credit balance and account status can only be changed by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard ON public.profiles;
CREATE TRIGGER profiles_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_protected_columns();

REVOKE EXECUTE ON FUNCTION public.profiles_guard_protected_columns() FROM PUBLIC, anon, authenticated;

-- 3. Calls: server-owned writes only, plus heartbeat + mode
DROP POLICY IF EXISTS "Clients update own calls" ON public.calls;
DROP POLICY IF EXISTS "Clients create own calls" ON public.calls;

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'paid';

ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_mode_check;
ALTER TABLE public.calls ADD CONSTRAINT calls_mode_check CHECK (mode IN ('paid', 'free'));

CREATE INDEX IF NOT EXISTS idx_calls_open ON public.calls (client_id) WHERE ended_at IS NULL;

-- 4. Server-only credit routines
CREATE OR REPLACE FUNCTION public.grant_credits(
  _user_id uuid, _seconds integer, _cents integer, _session text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, amount_cents, kind, stripe_session_id)
    VALUES (_user_id, _seconds, _cents, 'purchase', _session);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;

  UPDATE public.profiles
  SET credit_seconds = credit_seconds + _seconds
  WHERE id = _user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_credits(
  _user_id uuid, _seconds integer, _cents integer, _ref text, _kind text, _block boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, amount_cents, kind, stripe_session_id)
    VALUES (_user_id, -_seconds, -_cents, _kind, _ref);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;

  UPDATE public.profiles
  SET credit_seconds = GREATEST(credit_seconds - _seconds, 0),
      is_blocked = CASE WHEN _block THEN true ELSE is_blocked END
  WHERE id = _user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_call(
  _call_id uuid, _rate_cents integer, _end_at timestamptz DEFAULT NULL
) RETURNS TABLE (billed integer, cost integer, free_left integer, paid_left integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (ends_at - c.started_at)))::integer);

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
      cost_cents = cost_cents
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
$$;

CREATE OR REPLACE FUNCTION public.settle_stale_calls(_user_id uuid, _rate_cents integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id, last_heartbeat_at FROM public.calls
    WHERE client_id = _user_id AND ended_at IS NULL AND last_heartbeat_at < now() - interval '45 seconds'
  LOOP
    PERFORM public.settle_call(r.id, _rate_cents, r.last_heartbeat_at);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_credits(uuid, integer, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_credits(uuid, integer, integer, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_stale_calls(uuid, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_credits(uuid, integer, integer, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_call(uuid, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_stale_calls(uuid, integer) TO service_role;