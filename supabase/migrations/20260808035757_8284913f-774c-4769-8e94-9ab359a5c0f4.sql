ALTER TABLE public.profiles ALTER COLUMN free_credits SET DEFAULT 5;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, alias, locale, free_credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'alias', 'Anon ' || substr(NEW.id::text, 1, 4)),
    COALESCE(NEW.raw_user_meta_data ->> 'locale', 'nl'),
    5
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;