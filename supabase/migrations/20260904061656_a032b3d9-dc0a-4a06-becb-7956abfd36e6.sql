TRUNCATE TABLE public.site_visits;
TRUNCATE TABLE public.engagement_events;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read app settings" ON public.app_settings;
CREATE POLICY "Admins can read app settings" ON public.app_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value)
VALUES ('analytics_reset_at', date_trunc('day', now() AT TIME ZONE 'utc')::text)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();