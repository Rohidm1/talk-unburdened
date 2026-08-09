CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  country text,
  path text NOT NULL DEFAULT '/',
  referrer text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visits readable by admin"
ON public.site_visits FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX site_visits_created_at_idx ON public.site_visits (created_at DESC);
CREATE INDEX site_visits_country_idx ON public.site_visits (country);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_country text;