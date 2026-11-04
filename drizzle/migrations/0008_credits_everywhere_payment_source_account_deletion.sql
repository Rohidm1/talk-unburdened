-- Payment source tracking
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS payment_source text;
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS external_ref text;
UPDATE public.credit_transactions SET payment_source = 'stripe' WHERE kind = 'purchase' AND payment_source IS NULL AND stripe_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_external_ref_uniq ON public.credit_transactions(external_ref) WHERE external_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_stripe_session_uniq ON public.credit_transactions(stripe_session_id) WHERE stripe_session_id IS NOT NULL AND kind = 'purchase';

CREATE OR REPLACE FUNCTION public.grant_chat_credits(_user_id uuid, _credits integer, _cents integer, _session text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, credits_delta, amount_cents, kind, stripe_session_id, payment_source)
    VALUES (_user_id, 0, _credits, _cents, 'purchase', _session, 'stripe');
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
  UPDATE public.profiles SET chat_credits = chat_credits + _credits WHERE id = _user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_google_play_credits(_user_id uuid, _credits integer, _cents integer, _purchase_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    INSERT INTO public.credit_transactions (user_id, seconds_delta, credits_delta, amount_cents, kind, external_ref, payment_source)
    VALUES (_user_id, 0, _credits, _cents, 'purchase', 'gplay:' || _purchase_token, 'google_play');
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
  UPDATE public.profiles SET chat_credits = chat_credits + _credits WHERE id = _user_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_google_play_credits(uuid, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_google_play_credits(uuid, integer, integer, text) TO service_role;
REVOKE ALL ON FUNCTION public.grant_chat_credits(uuid, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_chat_credits(uuid, integer, integer, text) TO service_role;

-- One credit per sent message, shared by every interface
CREATE OR REPLACE FUNCTION public.spend_message_credit(_user_id uuid, _kind text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.profiles%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND OR p.is_blocked THEN RAISE EXCEPTION 'blocked'; END IF;
  IF p.free_credits > 0 THEN
    UPDATE public.profiles SET free_credits = free_credits - 1, sent_message_count = sent_message_count + 1 WHERE id = _user_id;
    INSERT INTO public.credit_transactions(user_id, seconds_delta, credits_delta, amount_cents, kind) VALUES (_user_id, 0, -1, 0, 'free_' || _kind);
  ELSIF p.chat_credits > 0 THEN
    UPDATE public.profiles SET chat_credits = chat_credits - 1, sent_message_count = sent_message_count + 1 WHERE id = _user_id;
    INSERT INTO public.credit_transactions(user_id, seconds_delta, credits_delta, amount_cents, kind) VALUES (_user_id, 0, -1, 0, _kind);
  ELSE
    RAISE EXCEPTION 'no_credit';
  END IF;
  RETURN p.free_credits + p.chat_credits - 1;
END;
$$;
REVOKE ALL ON FUNCTION public.spend_message_credit(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_message_credit(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.community_post_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.body ~* '\m(kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  NEW.body := public.mask_pii(NEW.body);
  NEW.alias := coalesce((SELECT alias FROM public.profiles WHERE id = NEW.user_id), 'Anonymous');
  IF (SELECT count(*) FROM public.community_posts WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute') >= 5 THEN
    RAISE EXCEPTION 'slow_down';
  END IF;
  PERFORM public.spend_message_credit(NEW.user_id, CASE WHEN NEW.parent_id IS NULL THEN 'community_post' ELSE 'community_reply' END);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.bottles_daily_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT count(*) FROM public.bottles WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours') >= 2 THEN
    RAISE EXCEPTION 'daily_limit';
  END IF;
  PERFORM public.spend_message_credit(NEW.user_id, 'bottle_drop');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.bottle_echo_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.spend_message_credit(NEW.user_id, 'bottle_reply');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bottle_echo_charge() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS bottle_echo_charge ON public.bottle_echoes;
CREATE TRIGGER bottle_echo_charge BEFORE INSERT ON public.bottle_echoes FOR EACH ROW EXECUTE FUNCTION public.bottle_echo_charge();

CREATE OR REPLACE FUNCTION public.fish_bottle()
RETURNS TABLE(id uuid, body text, echo_count integer, created_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b public.bottles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  SELECT * INTO b FROM public.bottles x WHERE x.is_hidden = false AND x.user_id <> auth.uid() ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM public.spend_message_credit(auth.uid(), 'bottle_open');
  id := b.id; body := b.body; echo_count := b.echo_count; created_at := b.created_at;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.speed_send(_match_id uuid, _body text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b text := btrim(_body);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.speed_matches WHERE id=_match_id AND status='active' AND ends_at > now() AND auth.uid() IN (user_a,user_b)) THEN
    RAISE EXCEPTION 'closed';
  END IF;
  IF char_length(b) < 1 OR char_length(b) > 500 THEN RAISE EXCEPTION 'length'; END IF;
  IF b ~* '\m(fuck you|kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|whore|slut|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  b := public.mask_pii(b);
  PERFORM public.spend_message_credit(auth.uid(), 'speed_message');
  INSERT INTO public.speed_messages(match_id,user_id,body) VALUES (_match_id, auth.uid(), b);
  RETURN b;
END $$;

-- Account & data deletion (called by the server before removing the login)
CREATE OR REPLACE FUNCTION public.delete_user_content(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.argument_votes WHERE user_id = _user_id;
  DELETE FROM public.dilemma_arguments WHERE user_id = _user_id;
  DELETE FROM public.dilemma_votes WHERE user_id = _user_id;
  DELETE FROM public.bottle_echoes WHERE user_id = _user_id;
  DELETE FROM public.bottles WHERE user_id = _user_id;
  UPDATE public.community_posts SET body = '[deleted]', alias = 'Deleted user', is_hidden = true,
    user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id = _user_id;
  DELETE FROM public.speed_queue WHERE user_id = _user_id;
  DELETE FROM public.speed_matches WHERE _user_id IN (user_a, user_b);
  DELETE FROM public.engagement_events WHERE user_id = _user_id;
  DELETE FROM public.support_tickets WHERE user_id = _user_id;
  DELETE FROM public.call_notes WHERE client_id = _user_id;
  DELETE FROM public.chat_sessions WHERE client_id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_user_content(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_content(uuid) TO service_role;

-- New accounts default to English
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, alias, locale, free_credits)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'alias', 'Anon ' || substr(NEW.id::text, 1, 4)), COALESCE(NEW.raw_user_meta_data ->> 'locale', 'en'), 5)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;