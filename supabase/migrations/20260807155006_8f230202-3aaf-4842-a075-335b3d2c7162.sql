-- 1. Credit balance in messages
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_credits integer NOT NULL DEFAULT 3;

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS credits_delta integer NOT NULL DEFAULT 0;

-- Protect the new balance columns from client-side writes
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    IF NEW.credit_seconds IS DISTINCT FROM OLD.credit_seconds
       OR NEW.free_seconds_remaining IS DISTINCT FROM OLD.free_seconds_remaining
       OR NEW.chat_credits IS DISTINCT FROM OLD.chat_credits
       OR NEW.free_credits IS DISTINCT FROM OLD.free_credits
       OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
      RAISE EXCEPTION 'credit balance and account status can only be changed by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Agent availability + queue
ALTER TABLE public.agent_presence
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS online_since timestamptz;

ALTER TABLE public.chat_sessions
  ALTER COLUMN listener_id DROP NOT NULL;

-- 3. Grant credits after a Stripe purchase
CREATE OR REPLACE FUNCTION public.grant_chat_credits(_user_id uuid, _credits integer, _cents integer, _session text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, credits_delta, amount_cents, kind, stripe_session_id)
    VALUES (_user_id, 0, _credits, _cents, 'purchase', _session);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;

  UPDATE public.profiles SET chat_credits = chat_credits + _credits WHERE id = _user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_chat_credits(_user_id uuid, _credits integer, _cents integer, _ref text, _kind text, _block boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, credits_delta, amount_cents, kind, stripe_session_id)
    VALUES (_user_id, 0, -_credits, -_cents, _kind, _ref);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;

  UPDATE public.profiles
  SET chat_credits = GREATEST(chat_credits - _credits, 0),
      is_blocked = CASE WHEN _block THEN true ELSE is_blocked END
  WHERE id = _user_id;
  RETURN true;
END;
$$;

-- 4. Spend one credit for a customer message (free credits first)
CREATE OR REPLACE FUNCTION public.spend_chat_credit(_user_id uuid, _session_id uuid)
RETURNS TABLE(ok boolean, free_left integer, paid_left integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND OR p.is_blocked THEN
    RETURN QUERY SELECT false, 0, 0; RETURN;
  END IF;

  IF p.free_credits > 0 THEN
    UPDATE public.profiles SET free_credits = free_credits - 1 WHERE id = _user_id;
    INSERT INTO public.credit_transactions (user_id, seconds_delta, credits_delta, amount_cents, kind)
    VALUES (_user_id, 0, -1, 0, 'free_message');
    RETURN QUERY SELECT true, p.free_credits - 1, p.chat_credits; RETURN;
  END IF;

  IF p.chat_credits > 0 THEN
    UPDATE public.profiles SET chat_credits = chat_credits - 1 WHERE id = _user_id;
    INSERT INTO public.credit_transactions (user_id, seconds_delta, credits_delta, amount_cents, kind)
    VALUES (_user_id, 0, -1, 0, 'message');
    RETURN QUERY SELECT true, 0, p.chat_credits - 1; RETURN;
  END IF;

  RETURN QUERY SELECT false, 0, 0;
END;
$$;

-- 5. Agent availability
CREATE OR REPLACE FUNCTION public.set_agent_availability(_agent_user_id uuid, _availability text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _availability NOT IN ('available', 'break', 'offline') THEN
    RAISE EXCEPTION 'invalid availability';
  END IF;

  INSERT INTO public.agent_presence (user_id, status, availability, last_seen_at, online_since)
  VALUES (
    _agent_user_id,
    CASE WHEN _availability = 'offline' THEN 'offline'::public.listener_status ELSE 'online'::public.listener_status END,
    _availability,
    now(),
    CASE WHEN _availability = 'offline' THEN NULL ELSE now() END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = CASE WHEN _availability = 'offline' THEN 'offline'::public.listener_status ELSE 'online'::public.listener_status END,
    availability = _availability,
    last_seen_at = now(),
    online_since = CASE
      WHEN _availability = 'offline' THEN NULL
      WHEN public.agent_presence.online_since IS NULL THEN now()
      ELSE public.agent_presence.online_since END;
END;
$$;

-- 6. Central queue: an agent claims the oldest waiting chat
CREATE OR REPLACE FUNCTION public.claim_next_chat(_agent_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE picked uuid;
BEGIN
  UPDATE public.chat_sessions s
  SET agent_user_id = _agent_user_id, status = 'active', answered_at = now()
  WHERE s.id = (
    SELECT id FROM public.chat_sessions
    WHERE agent_user_id IS NULL AND ended_at IS NULL AND status IN ('queued', 'ringing')
      AND last_heartbeat_at > now() - interval '60 seconds'
    ORDER BY started_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING s.id INTO picked;

  RETURN picked;
END;
$$;

-- 7. Close chats abandoned by the customer
CREATE OR REPLACE FUNCTION public.expire_stale_chats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.chat_sessions
  SET status = 'ended', ended_at = now()
  WHERE ended_at IS NULL AND last_heartbeat_at < now() - interval '60 seconds';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_chat_credits(uuid, integer, integer, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.revoke_chat_credits(uuid, integer, integer, text, text, boolean) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.spend_chat_credit(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_agent_availability(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.claim_next_chat(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.expire_stale_chats() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.grant_chat_credits(uuid, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_chat_credits(uuid, integer, integer, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_chat_credit(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_agent_availability(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_chat(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_chats() TO service_role;