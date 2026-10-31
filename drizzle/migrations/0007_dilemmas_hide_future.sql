DROP POLICY IF EXISTS "dilemmas public" ON public.dilemmas;
CREATE POLICY "published dilemmas are public" ON public.dilemmas
FOR SELECT TO anon, authenticated
USING (day <= (now() AT TIME ZONE 'utc')::date);