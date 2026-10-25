REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (alias, locale) ON public.profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.chat_messages FROM anon, authenticated;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sent_message_count integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.send_metered_chat_message(_user_id uuid, _session_id uuid, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.chat_sessions%ROWTYPE; p public.profiles%ROWTYPE; r text; f integer; c integer;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id AND email_confirmed_at IS NOT NULL AND is_anonymous IS NOT TRUE) THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'unverified');
 END IF;
 IF length(trim(_body)) < 1 OR length(_body) > 2000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
 SELECT * INTO s FROM public.chat_sessions WHERE id = _session_id FOR UPDATE;
 IF NOT FOUND OR s.ended_at IS NOT NULL OR s.status NOT IN ('ringing','queued','active') THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'closed');
 END IF;
 IF s.client_id = _user_id THEN r := 'client'; ELSIF s.agent_user_id = _user_id THEN r := 'agent'; ELSE
  RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
 END IF;
 SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
 IF NOT FOUND OR p.is_blocked THEN RETURN jsonb_build_object('ok', false, 'reason', 'blocked'); END IF;
 f := p.free_credits; c := p.chat_credits;
 IF r = 'client' THEN
  IF f > 0 THEN f := f - 1; ELSIF c > 0 THEN c := c - 1; ELSE
   RETURN jsonb_build_object('ok', false, 'reason', 'no_credit');
  END IF;
  UPDATE public.profiles SET free_credits = f, chat_credits = c, sent_message_count = sent_message_count + 1 WHERE id = _user_id;
  INSERT INTO public.credit_transactions(user_id, seconds_delta, credits_delta, amount_cents, kind)
  VALUES (_user_id, 0, -1, 0, CASE WHEN p.free_credits > 0 THEN 'free_message' ELSE 'message' END);
 END IF;
 INSERT INTO public.chat_messages(session_id, sender_role, sender_user_id, body) VALUES (_session_id, r, _user_id, trim(_body));
 RETURN jsonb_build_object('ok', true, 'reason', null, 'remaining', f + c);
END;
$$;
REVOKE ALL ON FUNCTION public.send_metered_chat_message(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_metered_chat_message(uuid, uuid, text) TO service_role;