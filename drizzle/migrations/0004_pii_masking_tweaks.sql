CREATE OR REPLACE FUNCTION public.mask_pii(_t text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE b text := _t;
  numw text := '(zero|oh|one|two|three|four|five|six|seven|eight|nine|nul|een|twee|drie|vier|vijf|zes|zeven|acht|negen|null|eins|zwei|drei|fünf|sechs|sieben|neun)';
BEGIN
  b := regexp_replace(b, '[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Za-z]{2,}', '[hidden]', 'gi');
  b := regexp_replace(b, '[A-Za-z0-9._%+-]+\s*(\(|\[|\{)?\s*(at|apenstaartje|bei)\s*(\)|\]|\})?\s*[A-Za-z0-9-]+\s*(\(|\[|\{)?\s*(dot|punt|punkt|\.)\s*(\)|\]|\})?\s*(com|net|org|nl|be|de|gr|eu|co|uk|io|info|me|fr|es|it)\M', '[hidden]', 'gi');
  b := regexp_replace(b, '\m(gmail|hotmail|outlook|yahoo|icloud|protonmail|proton|gmx|ziggo|kpnmail|telenet)(\s*(\.|dot|punt)\s*[a-z]{2,4})?\M', '[hidden]', 'gi');
  b := regexp_replace(b, '(https?://|www\.)\S+', '[hidden]', 'gi');
  b := regexp_replace(b, '\m[A-Za-z0-9-]+\.(com|net|org|nl|be|de|gr|eu|io|me|app|link)(/\S*)?\M', '[hidden]', 'gi');
  b := regexp_replace(b, '@[A-Za-z0-9_.]{3,}', '[hidden]', 'g');
  b := regexp_replace(b, '(\+|00)?\d(?:[\s().\-/_]*\d){6,}', '[hidden]', 'g');
  b := regexp_replace(b, numw || '(?:[\s,.\-]+' || numw || '){4,}', '[hidden]', 'gi');
  b := regexp_replace(b, '\m(odos|odós|οδός|leoforos|λεωφόρος)\s+[A-Za-zÀ-ÿΑ-ωά-ώ''-]+\s+\d{1,4}\M', '[hidden]', 'gi');
  b := regexp_replace(b, '\m[A-Za-zÀ-ÿ''-]*(straat|laan|weg|plein|gracht|dijk|kade|singel|steeg|hof|street|road|avenue|lane|drive|boulevard|strasse|straße|gasse|platz)\.?\s+\d{1,4}\s?[A-Za-z]?\M', '[hidden]', 'gi');
  b := regexp_replace(b, '\m\d{1,4}[A-Za-z]?\s+[A-Za-zÀ-ÿ''-]+(\s+[A-Za-zÀ-ÿ''-]+)?\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|way|court|ct)\.?\M', '[hidden]', 'gi');
  b := regexp_replace(b, '\m\d{4}\s?[A-Za-z]{2}\M', '[hidden]', 'g');
  b := regexp_replace(b, '\m[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}\M', '[hidden]', 'g');
  b := regexp_replace(b, '\m\d{3}\s?\d{2}\M', '[hidden]', 'g');
  RETURN b;
END $$;