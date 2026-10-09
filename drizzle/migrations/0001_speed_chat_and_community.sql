CREATE TABLE public.speed_queue (user_id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.speed_queue TO service_role;
ALTER TABLE public.speed_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.speed_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL, user_b uuid NOT NULL,
  ends_at timestamptz NOT NULL DEFAULT now() + interval '120 seconds',
  a_extend boolean NOT NULL DEFAULT false, b_extend boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.speed_matches TO authenticated;
GRANT ALL ON public.speed_matches TO service_role;
ALTER TABLE public.speed_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read match" ON public.speed_matches FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));

CREATE TABLE public.speed_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.speed_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.speed_messages TO authenticated;
GRANT ALL ON public.speed_messages TO service_role;
ALTER TABLE public.speed_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.speed_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.speed_matches m WHERE m.id = match_id AND auth.uid() IN (m.user_a, m.user_b)));

CREATE TABLE public.speed_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.speed_matches(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL, reported_id uuid NOT NULL, reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.speed_reports TO authenticated;
GRANT ALL ON public.speed_reports TO service_role;
ALTER TABLE public.speed_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read reports" ON public.speed_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.speed_join() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
    ORDER BY q.created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF other IS NULL THEN
    INSERT INTO public.speed_queue(user_id) VALUES (me) ON CONFLICT (user_id) DO UPDATE SET created_at = now();
    RETURN NULL;
  END IF;
  DELETE FROM public.speed_queue WHERE user_id IN (me, other);
  INSERT INTO public.speed_matches(user_a,user_b) VALUES (other, me) RETURNING id INTO mid;
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.speed_leave_queue() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  DELETE FROM public.speed_queue WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.speed_send(_match_id uuid, _body text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b text := btrim(_body);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.speed_matches WHERE id=_match_id AND status='active' AND ends_at > now() AND auth.uid() IN (user_a,user_b)) THEN
    RAISE EXCEPTION 'closed';
  END IF;
  IF char_length(b) < 1 OR char_length(b) > 500 THEN RAISE EXCEPTION 'length'; END IF;
  IF b ~* '\m(fuck you|kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|whore|slut|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  b := regexp_replace(b, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[hidden]', 'g');
  b := regexp_replace(b, '\+?[0-9][0-9 ().-]{7,}[0-9]', '[hidden]', 'g');
  b := regexp_replace(b, '(https?://|www\.)\S+', '[hidden]', 'gi');
  b := regexp_replace(b, '@[A-Za-z0-9_.]{3,}', '[hidden]', 'g');
  INSERT INTO public.speed_messages(match_id,user_id,body) VALUES (_match_id, auth.uid(), b);
  RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.speed_extend(_match_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.speed_matches SET
    a_extend = a_extend OR (auth.uid() = user_a),
    b_extend = b_extend OR (auth.uid() = user_b)
  WHERE id=_match_id AND status='active' AND ends_at > now() AND auth.uid() IN (user_a,user_b);
  UPDATE public.speed_matches SET ends_at = ends_at + interval '120 seconds', a_extend=false, b_extend=false
  WHERE id=_match_id AND a_extend AND b_extend;
END $$;

CREATE OR REPLACE FUNCTION public.speed_end(_match_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.speed_matches SET status='ended', ends_at = least(ends_at, now()) WHERE id=_match_id AND auth.uid() IN (user_a,user_b)
$$;

CREATE OR REPLACE FUNCTION public.speed_report(_match_id uuid, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.speed_matches;
BEGIN
  SELECT * INTO m FROM public.speed_matches WHERE id=_match_id AND auth.uid() IN (user_a,user_b);
  IF m.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  INSERT INTO public.speed_reports(match_id,reporter_id,reported_id,reason)
  VALUES (_match_id, auth.uid(), CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END, left(_reason, 300));
  UPDATE public.speed_matches SET status='ended', ends_at = least(ends_at, now()) WHERE id=_match_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.speed_join(), public.speed_leave_queue(), public.speed_send(uuid,text), public.speed_extend(uuid), public.speed_end(uuid), public.speed_report(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.speed_join(), public.speed_leave_queue(), public.speed_send(uuid,text), public.speed_extend(uuid), public.speed_end(uuid), public.speed_report(uuid,text) TO authenticated;

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL CHECK (topic IN ('relationships','ethics','unpopular-opinions','confessions')),
  parent_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  alias text NOT NULL DEFAULT 'Anonymous',
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 1000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts public" ON public.community_posts FOR SELECT TO anon, authenticated USING (is_hidden = false);
CREATE POLICY "post as self" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_hidden = false);
CREATE INDEX community_posts_topic_idx ON public.community_posts(topic, created_at DESC);

CREATE OR REPLACE FUNCTION public.community_post_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.body ~* '\m(kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  NEW.body := regexp_replace(NEW.body, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[hidden]', 'g');
  NEW.body := regexp_replace(NEW.body, '\+?[0-9][0-9 ().-]{7,}[0-9]', '[hidden]', 'g');
  NEW.alias := coalesce((SELECT alias FROM public.profiles WHERE id = NEW.user_id), 'Anonymous');
  IF (SELECT count(*) FROM public.community_posts WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute') >= 5 THEN
    RAISE EXCEPTION 'slow_down';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER community_post_guard BEFORE INSERT ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.community_post_guard();

ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_matches, public.speed_messages, public.community_posts;