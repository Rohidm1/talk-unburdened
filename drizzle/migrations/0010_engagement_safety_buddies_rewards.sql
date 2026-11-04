-- ===== Community topics + voting =====
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

CREATE TABLE public.community_votes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.community_votes TO authenticated;
GRANT ALL ON public.community_votes TO service_role;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own votes" ON public.community_votes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.vote_post(_post_id uuid, _value smallint)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); old smallint; s integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  IF _value NOT IN (-1, 0, 1) THEN RAISE EXCEPTION 'invalid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = _post_id AND is_hidden = false) THEN RAISE EXCEPTION 'not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.community_posts WHERE id = _post_id AND user_id = me) THEN RAISE EXCEPTION 'own_post'; END IF;
  SELECT value INTO old FROM public.community_votes WHERE post_id = _post_id AND user_id = me;
  IF _value = 0 THEN
    DELETE FROM public.community_votes WHERE post_id = _post_id AND user_id = me;
  ELSE
    INSERT INTO public.community_votes(post_id, user_id, value) VALUES (_post_id, me, _value)
    ON CONFLICT (post_id, user_id) DO UPDATE SET value = EXCLUDED.value;
  END IF;
  UPDATE public.community_posts SET score = score - coalesce(old, 0) + _value WHERE id = _post_id RETURNING score INTO s;
  RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.vote_post(uuid, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_post(uuid, smallint) TO authenticated;

-- ===== Blocks & reports =====
CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
GRANT SELECT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks readable" ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own blocks removable" ON public.user_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid,
  target_type text NOT NULL CHECK (target_type IN ('community_post', 'speed_chat', 'chat', 'buddy', 'bottle')),
  target_id uuid NOT NULL,
  reason text,
  excerpt text,
  blocked boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_reports_status_idx ON public.user_reports(status, created_at DESC);
GRANT SELECT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read reports" ON public.user_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.report_content(_target_type text, _target_id uuid, _reason text, _block boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); other uuid; ex text; n integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  IF (SELECT count(*) FROM public.user_reports WHERE reporter_id = me AND created_at > now() - interval '1 hour') >= 20 THEN RAISE EXCEPTION 'slow_down'; END IF;
  IF _target_type = 'community_post' THEN
    SELECT user_id, left(body, 300) INTO other, ex FROM public.community_posts WHERE id = _target_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  ELSIF _target_type = 'speed_chat' THEN
    SELECT CASE WHEN user_a = me THEN user_b ELSE user_a END INTO other FROM public.speed_matches WHERE id = _target_id AND me IN (user_a, user_b);
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
    SELECT string_agg(left(body, 120), ' | ' ORDER BY created_at DESC) INTO ex FROM (SELECT body, created_at FROM public.speed_messages WHERE match_id = _target_id AND user_id = other ORDER BY created_at DESC LIMIT 5) s;
    UPDATE public.speed_matches SET status = 'ended', ends_at = least(ends_at, now()) WHERE id = _target_id;
  ELSIF _target_type = 'chat' THEN
    IF NOT EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = _target_id AND client_id = me) THEN RAISE EXCEPTION 'not_found'; END IF;
    other := NULL;
  ELSIF _target_type = 'buddy' THEN
    SELECT CASE WHEN user_a = me THEN user_b ELSE user_a END INTO other FROM public.buddies WHERE id = _target_id AND me IN (user_a, user_b);
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
    UPDATE public.buddies SET status = 'ended' WHERE id = _target_id;
  ELSIF _target_type = 'bottle' THEN
    SELECT user_id, left(body, 300) INTO other, ex FROM public.bottles WHERE id = _target_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  ELSE
    RAISE EXCEPTION 'invalid';
  END IF;
  IF other = me THEN RAISE EXCEPTION 'own_content'; END IF;
  INSERT INTO public.user_reports(reporter_id, reported_id, target_type, target_id, reason, excerpt, blocked)
  VALUES (me, other, _target_type, _target_id, left(coalesce(_reason, ''), 300), ex, _block AND other IS NOT NULL);
  IF _block AND other IS NOT NULL THEN
    INSERT INTO public.user_blocks(blocker_id, blocked_id) VALUES (me, other) ON CONFLICT DO NOTHING;
  END IF;
  -- Three separate reports hide a community post or bottle until reviewed
  IF _target_type IN ('community_post', 'bottle') THEN
    SELECT count(DISTINCT reporter_id) INTO n FROM public.user_reports WHERE target_type = _target_type AND target_id = _target_id;
    IF n >= 3 THEN
      IF _target_type = 'community_post' THEN UPDATE public.community_posts SET is_hidden = true WHERE id = _target_id;
      ELSE UPDATE public.bottles SET is_hidden = true WHERE id = _target_id; END IF;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.block_user_by_post(_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); other uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  SELECT user_id INTO other FROM public.community_posts WHERE id = _post_id;
  IF other IS NULL OR other = me THEN RAISE EXCEPTION 'not_found'; END IF;
  INSERT INTO public.user_blocks(blocker_id, blocked_id) VALUES (me, other) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.block_user_by_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_user_by_post(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(_report_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.user_reports%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.user_reports WHERE id = _report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _action = 'dismiss' THEN
    UPDATE public.user_reports SET status = 'dismissed' WHERE id = _report_id;
    IF r.target_type = 'community_post' THEN UPDATE public.community_posts SET is_hidden = false WHERE id = r.target_id; END IF;
    IF r.target_type = 'bottle' THEN UPDATE public.bottles SET is_hidden = false WHERE id = r.target_id; END IF;
  ELSIF _action = 'hide' THEN
    IF r.target_type = 'community_post' THEN UPDATE public.community_posts SET is_hidden = true WHERE id = r.target_id; END IF;
    IF r.target_type = 'bottle' THEN UPDATE public.bottles SET is_hidden = true WHERE id = r.target_id; END IF;
    UPDATE public.user_reports SET status = 'actioned' WHERE target_type = r.target_type AND target_id = r.target_id;
  ELSIF _action = 'suspend' THEN
    IF r.reported_id IS NULL THEN RAISE EXCEPTION 'no_account'; END IF;
    UPDATE public.profiles SET is_blocked = true WHERE id = r.reported_id;
    UPDATE public.user_reports SET status = 'actioned' WHERE reported_id = r.reported_id AND status = 'open';
  ELSE
    RAISE EXCEPTION 'invalid';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_resolve_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text) TO authenticated;

-- ===== Anonymous buddies =====
CREATE OR REPLACE FUNCTION public.gen_codename()
RETURNS text LANGUAGE sql VOLATILE SET search_path TO 'public' AS $$
  SELECT (ARRAY['Quiet','Gentle','Brave','Calm','Warm','Steady','Kind','Bright','Patient','Hopeful','Silver','Golden'])[1 + floor(random() * 12)::int]
    || ' ' ||
    (ARRAY['Fox','Owl','Harbor','Lantern','River','Cedar','Comet','Falcon','Willow','Ember','Tide','Sparrow'])[1 + floor(random() * 12)::int]
$$;

CREATE TABLE public.buddies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  codename_a text NOT NULL DEFAULT public.gen_codename(),
  codename_b text NOT NULL DEFAULT public.gen_codename(),
  requested_by uuid NOT NULL,
  source_match_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a <> user_b)
);
CREATE UNIQUE INDEX buddies_pair_uniq ON public.buddies (least(user_a, user_b), greatest(user_a, user_b)) WHERE status <> 'ended';
GRANT SELECT ON public.buddies TO authenticated;
GRANT ALL ON public.buddies TO service_role;
ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read buddies" ON public.buddies FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));

CREATE TABLE public.buddy_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id uuid NOT NULL REFERENCES public.buddies(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX buddy_notes_buddy_idx ON public.buddy_notes(buddy_id, created_at);
GRANT SELECT ON public.buddy_notes TO authenticated;
GRANT ALL ON public.buddy_notes TO service_role;
ALTER TABLE public.buddy_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read notes" ON public.buddy_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.buddies b WHERE b.id = buddy_id AND auth.uid() IN (b.user_a, b.user_b)));

CREATE OR REPLACE FUNCTION public.buddy_request(_match_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); other uuid; b public.buddies%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  SELECT CASE WHEN user_a = me THEN user_b ELSE user_a END INTO other FROM public.speed_matches WHERE id = _match_id AND me IN (user_a, user_b);
  IF other IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks WHERE (blocker_id = me AND blocked_id = other) OR (blocker_id = other AND blocked_id = me)) THEN RAISE EXCEPTION 'not_found'; END IF;
  IF (SELECT count(*) FROM public.buddies WHERE me IN (user_a, user_b) AND status <> 'ended') >= 10 THEN RAISE EXCEPTION 'buddy_limit'; END IF;
  SELECT * INTO b FROM public.buddies WHERE least(user_a, user_b) = least(me, other) AND greatest(user_a, user_b) = greatest(me, other) AND status <> 'ended';
  IF NOT FOUND THEN
    INSERT INTO public.buddies(user_a, user_b, requested_by, source_match_id) VALUES (me, other, me, _match_id);
    RETURN 'pending';
  END IF;
  IF b.status = 'pending' AND b.requested_by <> me THEN
    UPDATE public.buddies SET status = 'active' WHERE id = b.id;
    RETURN 'active';
  END IF;
  RETURN b.status;
END $$;
REVOKE ALL ON FUNCTION public.buddy_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.buddy_respond(_buddy_id uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.buddies SET status = CASE WHEN _accept THEN 'active' ELSE 'ended' END
  WHERE id = _buddy_id AND status = 'pending' AND auth.uid() IN (user_a, user_b) AND requested_by <> auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.buddy_respond(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_respond(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.buddy_end(_buddy_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.buddies SET status = 'ended' WHERE id = _buddy_id AND auth.uid() IN (user_a, user_b)
$$;
REVOKE ALL ON FUNCTION public.buddy_end(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_end(uuid) TO authenticated;

-- Buddy notes are free, but limited to one per buddy per day
CREATE OR REPLACE FUNCTION public.send_buddy_note(_buddy_id uuid, _body text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); b text := btrim(_body);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = me AND is_blocked) THEN RAISE EXCEPTION 'blocked'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.buddies WHERE id = _buddy_id AND status = 'active' AND me IN (user_a, user_b)) THEN RAISE EXCEPTION 'not_found'; END IF;
  IF char_length(b) < 2 OR char_length(b) > 300 THEN RAISE EXCEPTION 'length'; END IF;
  IF b ~* '\m(fuck you|kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|whore|slut|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  IF EXISTS (SELECT 1 FROM public.buddy_notes WHERE buddy_id = _buddy_id AND sender_id = me AND created_at > date_trunc('day', now())) THEN RAISE EXCEPTION 'daily_limit'; END IF;
  b := public.mask_pii(b);
  INSERT INTO public.buddy_notes(buddy_id, sender_id, body) VALUES (_buddy_id, me, b);
  RETURN b;
END $$;
REVOKE ALL ON FUNCTION public.send_buddy_note(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_buddy_note(uuid, text) TO authenticated;

-- ===== Speed Chat & bottles respect blocks =====
CREATE OR REPLACE FUNCTION public.speed_join()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); other uuid; mid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = me AND is_blocked) THEN RAISE EXCEPTION 'blocked'; END IF;
  SELECT id INTO mid FROM public.speed_matches WHERE status='active' AND ends_at > now() AND me IN (user_a,user_b) LIMIT 1;
  IF mid IS NOT NULL THEN RETURN mid; END IF;
  IF (SELECT count(*) FROM public.speed_matches WHERE me IN (user_a,user_b) AND created_at > now() - interval '24 hours') >= 3 THEN
    RAISE EXCEPTION 'daily_limit';
  END IF;
  DELETE FROM public.speed_queue WHERE created_at < now() - interval '2 minutes';
  SELECT q.user_id INTO other FROM public.speed_queue q WHERE q.user_id <> me
    AND NOT EXISTS (SELECT 1 FROM public.speed_reports r WHERE (r.reporter_id=me AND r.reported_id=q.user_id) OR (r.reporter_id=q.user_id AND r.reported_id=me))
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks k WHERE (k.blocker_id=me AND k.blocked_id=q.user_id) OR (k.blocker_id=q.user_id AND k.blocked_id=me))
    ORDER BY q.created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF other IS NULL THEN
    INSERT INTO public.speed_queue(user_id) VALUES (me) ON CONFLICT (user_id) DO UPDATE SET created_at = now();
    RETURN NULL;
  END IF;
  DELETE FROM public.speed_queue WHERE user_id IN (me, other);
  INSERT INTO public.speed_matches(user_a,user_b) VALUES (other, me) RETURNING id INTO mid;
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.fish_bottle()
RETURNS TABLE(id uuid, body text, echo_count integer, created_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b public.bottles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  SELECT * INTO b FROM public.bottles x WHERE x.is_hidden = false AND x.user_id <> auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks k WHERE k.blocker_id = auth.uid() AND k.blocked_id = x.user_id)
    ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM public.spend_message_credit(auth.uid(), 'bottle_open');
  id := b.id; body := b.body; echo_count := b.echo_count; created_at := b.created_at;
  RETURN NEXT;
END $$;

-- ===== Daily fortune (1 bonus credit per day) =====
CREATE TABLE public.fortune_claims (
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  quote_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.fortune_claims TO authenticated;
GRANT ALL ON public.fortune_claims TO service_role;
ALTER TABLE public.fortune_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fortunes" ON public.fortune_claims FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.claim_daily_fortune()
RETURNS TABLE(quote_index integer, granted boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); q integer; today date := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = me AND is_blocked) THEN RAISE EXCEPTION 'blocked'; END IF;
  SELECT f.quote_index INTO q FROM public.fortune_claims f WHERE f.user_id = me AND f.day = today;
  IF FOUND THEN quote_index := q; granted := false; RETURN NEXT; RETURN; END IF;
  q := floor(random() * 1000)::int;
  INSERT INTO public.fortune_claims(user_id, day, quote_index) VALUES (me, today, q);
  UPDATE public.profiles SET free_credits = free_credits + 1 WHERE id = me;
  INSERT INTO public.credit_transactions(user_id, seconds_delta, credits_delta, amount_cents, kind) VALUES (me, 0, 1, 0, 'daily_fortune');
  quote_index := q; granted := true; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.claim_daily_fortune() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_fortune() TO authenticated;

-- ===== Mood SOS streaks (2 credits at 3 days, 5 at 7 days) =====
CREATE TABLE public.sos_days (
  user_id uuid NOT NULL,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.sos_days TO authenticated;
GRANT ALL ON public.sos_days TO service_role;
ALTER TABLE public.sos_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sos days" ON public.sos_days FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.complete_sos()
RETURNS TABLE(streak integer, reward integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); today date := (now() AT TIME ZONE 'utc')::date; s integer := 0; d date; r integer := 0; inserted boolean := false;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  INSERT INTO public.sos_days(user_id, day) VALUES (me, today) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS s = ROW_COUNT; inserted := s > 0; s := 0;
  d := today;
  WHILE EXISTS (SELECT 1 FROM public.sos_days WHERE user_id = me AND day = d) LOOP
    s := s + 1; d := d - 1;
  END LOOP;
  IF inserted AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = me AND is_blocked) THEN
    IF s = 3 THEN r := 2; ELSIF s = 7 THEN r := 5; END IF;
    IF r > 0 THEN
      UPDATE public.profiles SET free_credits = free_credits + r WHERE id = me;
      INSERT INTO public.credit_transactions(user_id, seconds_delta, credits_delta, amount_cents, kind) VALUES (me, 0, r, 0, 'sos_streak');
    END IF;
  END IF;
  streak := s; reward := r; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.complete_sos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_sos() TO authenticated;

-- ===== Referrals (5 credits for both) =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text DEFAULT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uniq ON public.profiles(referral_code);

CREATE TABLE public.referrals (
  referred_id uuid PRIMARY KEY,
  referrer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth' AS $$
DECLARE me uuid := auth.uid(); ref uuid; u record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth'; END IF;
  SELECT email_confirmed_at, created_at, is_anonymous INTO u FROM auth.users WHERE id = me;
  IF u.email_confirmed_at IS NULL OR coalesce(u.is_anonymous, false) THEN RETURN 'unverified'; END IF;
  IF u.created_at < now() - interval '7 days' THEN RETURN 'too_old'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = me) THEN RETURN 'already'; END IF;
  SELECT id INTO ref FROM public.profiles WHERE referral_code = lower(btrim(_code)) AND NOT is_blocked;
  IF ref IS NULL OR ref = me THEN RETURN 'invalid'; END IF;
  INSERT INTO public.referrals(referred_id, referrer_id) VALUES (me, ref);
  UPDATE public.profiles SET free_credits = free_credits + 5 WHERE id IN (me, ref);
  INSERT INTO public.credit_transactions(user_id, seconds_delta, credits_delta, amount_cents, kind)
  VALUES (me, 0, 5, 0, 'referral_bonus'), (ref, 0, 5, 0, 'referral_bonus');
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.redeem_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;

-- ===== Support Wings (reputation) =====
CREATE OR REPLACE FUNCTION public.my_wings()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN 0 ELSE
    coalesce((SELECT sum(greatest(v.value, 0)) FROM public.community_votes v JOIN public.community_posts p ON p.id = v.post_id WHERE p.user_id = auth.uid()), 0)::int
    + 2 * (SELECT count(*) FROM public.community_posts WHERE user_id = auth.uid() AND parent_id IS NOT NULL)::int
    + 2 * (SELECT count(*) FROM public.community_posts WHERE user_id = auth.uid() AND parent_id IS NULL)::int
    + 2 * (SELECT count(*) FROM public.bottle_echoes WHERE user_id = auth.uid())::int
    + 2 * (SELECT count(*) FROM public.buddy_notes WHERE sender_id = auth.uid())::int
    + (SELECT count(*) FROM public.speed_matches WHERE auth.uid() IN (user_a, user_b))::int
  END
$$;
REVOKE ALL ON FUNCTION public.my_wings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_wings() TO authenticated;

-- Report RPC grants (after buddies table exists)
REVOKE ALL ON FUNCTION public.report_content(text, uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_content(text, uuid, text, boolean) TO authenticated;

-- Account deletion also removes the new personal data
CREATE OR REPLACE FUNCTION public.delete_user_content(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.ai_playbook WHERE interaction_id IN (
    SELECT i.id FROM public.ai_interactions i JOIN public.chat_sessions s ON s.id = i.session_id WHERE s.client_id = _user_id
  );
  DELETE FROM public.argument_votes WHERE user_id = _user_id;
  DELETE FROM public.dilemma_arguments WHERE user_id = _user_id;
  DELETE FROM public.dilemma_votes WHERE user_id = _user_id;
  DELETE FROM public.bottle_echoes WHERE user_id = _user_id;
  DELETE FROM public.bottles WHERE user_id = _user_id;
  DELETE FROM public.community_votes WHERE user_id = _user_id;
  UPDATE public.community_posts SET body = '[deleted]', alias = 'Deleted user', is_hidden = true,
    user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id = _user_id;
  DELETE FROM public.speed_queue WHERE user_id = _user_id;
  DELETE FROM public.speed_matches WHERE _user_id IN (user_a, user_b);
  DELETE FROM public.buddies WHERE _user_id IN (user_a, user_b);
  DELETE FROM public.user_blocks WHERE _user_id IN (blocker_id, blocked_id);
  DELETE FROM public.fortune_claims WHERE user_id = _user_id;
  DELETE FROM public.sos_days WHERE user_id = _user_id;
  DELETE FROM public.referrals WHERE _user_id IN (referred_id, referrer_id);
  UPDATE public.user_reports SET reporter_id = '00000000-0000-0000-0000-000000000000' WHERE reporter_id = _user_id;
  DELETE FROM public.engagement_events WHERE user_id = _user_id;
  DELETE FROM public.support_tickets WHERE user_id = _user_id;
  DELETE FROM public.call_notes WHERE client_id = _user_id;
  DELETE FROM public.chat_sessions WHERE client_id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_user_content(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_content(uuid) TO service_role;

-- Realtime for buddy notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.buddy_notes;