CREATE OR REPLACE FUNCTION public.community_post_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.body ~* '\m(kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|cunt)' OR coalesce(NEW.title, '') ~* '\m(kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  NEW.body := public.mask_pii(NEW.body);
  IF NEW.parent_id IS NOT NULL THEN NEW.title := NULL;
  ELSIF NEW.title IS NOT NULL THEN NEW.title := left(public.mask_pii(btrim(NEW.title)), 120);
  END IF;
  NEW.score := 0;
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
  IF NEW.body ~* '\m(kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  IF (SELECT count(*) FROM public.bottles WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours') >= 2 THEN
    RAISE EXCEPTION 'daily_limit';
  END IF;
  NEW.body := public.mask_pii(NEW.body);
  NEW.is_hidden := false;
  NEW.echo_count := 0;
  PERFORM public.spend_message_credit(NEW.user_id, 'bottle_drop');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.bottle_echo_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.body ~* '\m(kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  NEW.body := public.mask_pii(NEW.body);
  PERFORM public.spend_message_credit(NEW.user_id, 'bottle_reply');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bottle_echo_charge() FROM PUBLIC, anon, authenticated;