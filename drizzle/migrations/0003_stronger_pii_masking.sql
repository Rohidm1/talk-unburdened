CREATE OR REPLACE FUNCTION public.mask_pii(_t text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE b text := _t;
  numw text := '(zero|oh|one|two|three|four|five|six|seven|eight|nine|nul|een|twee|drie|vier|vijf|zes|zeven|acht|negen|null|eins|zwei|drei|fünf|sechs|sieben|neun)';
BEGIN
  -- Emails, normal and spelled out ("name at gmail dot com", "name(at)mail[dot]nl")
  b := regexp_replace(b, '[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Za-z]{2,}', '[hidden]', 'gi');
  b := regexp_replace(b, '[A-Za-z0-9._%+-]+\s*(\(|\[|\{)?\s*(at|apenstaartje|bei)\s*(\)|\]|\})?\s*[A-Za-z0-9-]+\s*(\(|\[|\{)?\s*(dot|punt|punkt|\.)\s*(\)|\]|\})?\s*(com|net|org|nl|be|de|gr|eu|co|uk|io|info|me|fr|es|it)\M', '[hidden]', 'gi');
  b := regexp_replace(b, '\m(gmail|hotmail|outlook|yahoo|icloud|live|protonmail|proton|gmx|ziggo|kpnmail|telenet)(\s*(\.|dot|punt)\s*[a-z]{2,4})?\M', '[hidden]', 'gi');
  -- Links & social handles
  b := regexp_replace(b, '(https?://|www\.)\S+', '[hidden]', 'gi');
  b := regexp_replace(b, '\m[A-Za-z0-9-]+\.(com|net|org|nl|be|de|gr|eu|io|me|app|link)(/\S*)?\M', '[hidden]', 'gi');
  b := regexp_replace(b, '@[A-Za-z0-9_.]{3,}', '[hidden]', 'g');
  -- Phone numbers: 7+ digits with any separators, or 5+ spelled-out digits
  b := regexp_replace(b, '(\+|00)?\d(?:[\s().\-/_]*\d){6,}', '[hidden]', 'g');
  b := regexp_replace(b, numw || '(?:[\s,.\-]+' || numw || '){4,}', '[hidden]', 'gi');
  -- Addresses: street + house number (NL/EN/DE/GR), postcodes
  b := regexp_replace(b, '\m[A-Za-zÀ-ÿ''-]*(straat|laan|weg|plein|gracht|dijk|kade|singel|steeg|hof|street|road|avenue|lane|drive|boulevard|strasse|straße|gasse|platz|odos|odós)\.?\s+\d{1,4}\s?[A-Za-z]?\M', '[hidden]', 'gi');
  b := regexp_replace(b, '\m\d{1,4}[A-Za-z]?\s+[A-Za-zÀ-ÿ''-]+(\s+[A-Za-zÀ-ÿ''-]+)?\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|way|court|ct)\.?\M', '[hidden]', 'gi');
  b := regexp_replace(b, '\m\d{4}\s?[A-Za-z]{2}\M', '[hidden]', 'g');
  b := regexp_replace(b, '\m[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}\M', '[hidden]', 'g');
  b := regexp_replace(b, '\m\d{3}\s?\d{2}\M', '[hidden]', 'g');
  RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.speed_send(_match_id uuid, _body text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b text := btrim(_body);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.speed_matches WHERE id=_match_id AND status='active' AND ends_at > now() AND auth.uid() IN (user_a,user_b)) THEN
    RAISE EXCEPTION 'closed';
  END IF;
  IF char_length(b) < 1 OR char_length(b) > 500 THEN RAISE EXCEPTION 'length'; END IF;
  IF b ~* '\m(fuck you|kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|whore|slut|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  b := public.mask_pii(b);
  INSERT INTO public.speed_messages(match_id,user_id,body) VALUES (_match_id, auth.uid(), b);
  RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.community_post_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.body ~* '\m(kill yourself|kys|n[i1]gg|f[a@]gg?ot|retard|cunt)' THEN RAISE EXCEPTION 'toxic'; END IF;
  NEW.body := public.mask_pii(NEW.body);
  NEW.alias := coalesce((SELECT alias FROM public.profiles WHERE id = NEW.user_id), 'Anonymous');
  IF (SELECT count(*) FROM public.community_posts WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute') >= 5 THEN
    RAISE EXCEPTION 'slow_down';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.community_post_guard() FROM public, anon, authenticated;