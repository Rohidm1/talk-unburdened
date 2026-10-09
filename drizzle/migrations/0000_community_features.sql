CREATE TABLE public.bottles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 3 AND 280),
  echo_count integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bottles TO authenticated;
GRANT ALL ON public.bottles TO service_role;
ALTER TABLE public.bottles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bottles readable" ON public.bottles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "drop own bottle" ON public.bottles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bottles_daily_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (SELECT count(*) FROM public.bottles WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours') >= 2 THEN
    RAISE EXCEPTION 'daily_limit';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bottles_limit BEFORE INSERT ON public.bottles FOR EACH ROW EXECUTE FUNCTION public.bottles_daily_limit();

CREATE TABLE public.bottle_echoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_id uuid NOT NULL REFERENCES public.bottles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 140),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bottle_echoes TO authenticated;
GRANT ALL ON public.bottle_echoes TO service_role;
ALTER TABLE public.bottle_echoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "echo readable by writer or bottle owner" ON public.bottle_echoes FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.bottles b WHERE b.id = bottle_id AND b.user_id = auth.uid()));
CREATE POLICY "write own echo" ON public.bottle_echoes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_echo_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN UPDATE public.bottles SET echo_count = echo_count + 1 WHERE id = NEW.bottle_id; RETURN NEW; END $$;
CREATE TRIGGER echo_count AFTER INSERT ON public.bottle_echoes FOR EACH ROW EXECUTE FUNCTION public.bump_echo_count();

CREATE OR REPLACE FUNCTION public.fish_bottle() RETURNS TABLE(id uuid, body text, echo_count integer, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT b.id, b.body, b.echo_count, b.created_at FROM public.bottles b
  WHERE b.is_hidden = false AND b.user_id <> auth.uid()
  ORDER BY random() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.fish_bottle() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.fish_bottle() TO authenticated;

CREATE TABLE public.dilemmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dilemmas TO anon, authenticated;
GRANT ALL ON public.dilemmas TO service_role;
ALTER TABLE public.dilemmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dilemmas public" ON public.dilemmas FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.dilemma_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dilemma_id uuid NOT NULL REFERENCES public.dilemmas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  choice text NOT NULL CHECK (choice IN ('a','b')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dilemma_id, user_id)
);
GRANT SELECT, INSERT ON public.dilemma_votes TO authenticated;
GRANT ALL ON public.dilemma_votes TO service_role;
ALTER TABLE public.dilemma_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vote" ON public.dilemma_votes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "cast own vote" ON public.dilemma_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.dilemma_results(_dilemma_id uuid) RETURNS TABLE(votes_a integer, votes_b integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dilemma_votes WHERE dilemma_id=_dilemma_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'vote_first';
  END IF;
  RETURN QUERY SELECT count(*) FILTER (WHERE choice='a')::int, count(*) FILTER (WHERE choice='b')::int
    FROM public.dilemma_votes WHERE dilemma_id=_dilemma_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.dilemma_results(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.dilemma_results(uuid) TO authenticated;

CREATE TABLE public.dilemma_arguments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dilemma_id uuid NOT NULL REFERENCES public.dilemmas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  side text NOT NULL CHECK (side IN ('a','b')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 3 AND 280),
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dilemma_arguments TO authenticated;
GRANT ALL ON public.dilemma_arguments TO service_role;
ALTER TABLE public.dilemma_arguments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arguments visible to voters" ON public.dilemma_arguments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.dilemma_votes v WHERE v.dilemma_id = dilemma_arguments.dilemma_id AND v.user_id = auth.uid()));
CREATE POLICY "voters post arguments" ON public.dilemma_arguments FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.dilemma_votes v WHERE v.dilemma_id = dilemma_arguments.dilemma_id AND v.user_id = auth.uid() AND v.choice = side));

CREATE TABLE public.argument_votes (
  argument_id uuid NOT NULL REFERENCES public.dilemma_arguments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1,1)),
  PRIMARY KEY (argument_id, user_id)
);
GRANT SELECT ON public.argument_votes TO authenticated;
GRANT ALL ON public.argument_votes TO service_role;
ALTER TABLE public.argument_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own argument votes" ON public.argument_votes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.vote_argument(_argument_id uuid, _value smallint) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s integer;
BEGIN
  IF auth.uid() IS NULL OR _value NOT IN (-1,1) THEN RAISE EXCEPTION 'invalid'; END IF;
  INSERT INTO public.argument_votes(argument_id,user_id,value) VALUES (_argument_id, auth.uid(), _value)
  ON CONFLICT (argument_id,user_id) DO UPDATE SET value = EXCLUDED.value;
  UPDATE public.dilemma_arguments SET score = (SELECT coalesce(sum(value),0) FROM public.argument_votes WHERE argument_id=_argument_id)
  WHERE id=_argument_id RETURNING score INTO s;
  RETURN s;
END $$;
REVOKE EXECUTE ON FUNCTION public.vote_argument(uuid, smallint) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.vote_argument(uuid, smallint) TO authenticated;

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  category text NOT NULL DEFAULT 'complaint',
  summary text NOT NULL,
  transcript text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read tickets" ON public.support_tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));