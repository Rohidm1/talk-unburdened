CREATE TYPE public.app_role AS ENUM ('client', 'staff', 'admin');
CREATE TYPE public.listener_status AS ENUM ('online', 'busy', 'offline');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL DEFAULT 'Anon',
  locale TEXT NOT NULL DEFAULT 'nl',
  credit_seconds INTEGER NOT NULL DEFAULT 180,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Own profile is readable" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own profile is editable" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Roles readable by owner or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- LISTENERS
CREATE TABLE public.listeners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  avatar_key TEXT NOT NULL,
  bio_en TEXT NOT NULL,
  bio_nl TEXT NOT NULL,
  languages TEXT[] NOT NULL DEFAULT '{}',
  topics_en TEXT[] NOT NULL DEFAULT '{}',
  topics_nl TEXT[] NOT NULL DEFAULT '{}',
  status public.listener_status NOT NULL DEFAULT 'offline',
  years INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listeners TO anon;
GRANT SELECT, UPDATE ON public.listeners TO authenticated;
GRANT ALL ON public.listeners TO service_role;
ALTER TABLE public.listeners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active listeners are public" ON public.listeners FOR SELECT TO anon, authenticated
  USING (is_active = true);
CREATE POLICY "Listener can edit own row" ON public.listeners FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- CALLS
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listener_id UUID NOT NULL REFERENCES public.listeners(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  free_seconds_used INTEGER NOT NULL DEFAULT 0,
  billed_seconds INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  room_name TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Calls visible to client, listener or admin" ON public.calls FOR SELECT TO authenticated
  USING (
    auth.uid() = client_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.listeners l WHERE l.id = calls.listener_id AND l.user_id = auth.uid())
  );
CREATE POLICY "Clients create own calls" ON public.calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients update own calls" ON public.calls FOR UPDATE TO authenticated
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

-- CALL NOTES
CREATE TABLE public.call_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
  listener_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_alias TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_notes TO authenticated;
GRANT ALL ON public.call_notes TO service_role;
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes readable by author or admin" ON public.call_notes FOR SELECT TO authenticated
  USING (auth.uid() = listener_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Notes written by author" ON public.call_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = listener_user_id AND public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Notes updated by author" ON public.call_notes FOR UPDATE TO authenticated
  USING (auth.uid() = listener_user_id) WITH CHECK (auth.uid() = listener_user_id);
CREATE POLICY "Notes deleted by author" ON public.call_notes FOR DELETE TO authenticated
  USING (auth.uid() = listener_user_id);

-- CREDIT TRANSACTIONS
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seconds_delta INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'purchase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own credit history" ON public.credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, alias, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'alias', 'Anon ' || substr(NEW.id::text, 1, 4)),
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'nl')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER listeners_touch BEFORE UPDATE ON public.listeners
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.listeners;

INSERT INTO public.listeners (display_name, avatar_key, bio_en, bio_nl, languages, topics_en, topics_nl, status, years, sort_order) VALUES
('Noor','listener-1','Calm, direct and hard to shock. Good with work pressure and the stuff you never say out loud.','Rustig, direct en niet snel verbaasd. Goed met werkdruk en de dingen die je nooit hardop zegt.','{NL,EN}','{"Work stress","Burnout signals","Unwinding"}','{"Werkstress","Oververmoeid","Ontspannen"}','online',6,1),
('Elise','listener-2','Warm and easy-going. Likes long talks about relationships, family and the messy middle.','Warm en laagdrempelig. Houdt van lange gesprekken over relaties, familie en alles daartussenin.','{NL,EN}','{"Relationships","Fatherhood","Loneliness"}','{"Relaties","Vaderschap","Eenzaamheid"}','busy',4,2),
('Maja','listener-3','Straight talker with a dry sense of humour. Great for venting after a rough week.','Recht voor z''n raap met droge humor. Ideaal om even flink te ventileren.','{EN}','{"Venting","Money worries","Career moves"}','{"Even ventileren","Geldzorgen","Carrièrekeuzes"}','online',8,3),
('Fenna','listener-4','Thoughtful listener who lets silences breathe. Nights and early mornings are her thing.','Bedachtzame luisteraar die stiltes laat bestaan. Nachten en vroege ochtenden zijn haar ding.','{NL,EN}','{"Late night talks","Divorce","Self doubt"}','{"Nachtgesprekken","Scheiding","Twijfel"}','offline',3,4);