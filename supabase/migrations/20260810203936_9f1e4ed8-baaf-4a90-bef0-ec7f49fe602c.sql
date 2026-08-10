CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  persona_id uuid,
  persona_name text NOT NULL DEFAULT 'Anontalk',
  user_prompt text NOT NULL DEFAULT '',
  ai_response text NOT NULL,
  user_replied boolean NOT NULL DEFAULT false,
  replied_at timestamptz,
  session_duration_seconds integer NOT NULL DEFAULT 0,
  credit_purchased boolean NOT NULL DEFAULT false,
  engagement_score integer NOT NULL DEFAULT 0,
  promoted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_interactions_session_idx ON public.ai_interactions (session_id, created_at DESC);

GRANT ALL ON public.ai_interactions TO service_role;
GRANT SELECT ON public.ai_interactions TO authenticated;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI interactions readable by admin"
  ON public.ai_interactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.ai_playbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid REFERENCES public.ai_interactions(id) ON DELETE SET NULL,
  persona_name text NOT NULL DEFAULT 'Anontalk',
  user_prompt text NOT NULL,
  ai_response text NOT NULL,
  engagement_score integer NOT NULL DEFAULT 0,
  model_version text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_playbook_embedding_idx
  ON public.ai_playbook USING hnsw (embedding vector_cosine_ops);

GRANT ALL ON public.ai_playbook TO service_role;
GRANT SELECT ON public.ai_playbook TO authenticated;
ALTER TABLE public.ai_playbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI playbook readable by admin"
  ON public.ai_playbook FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.match_ai_playbook(query_embedding vector(1536), match_count int DEFAULT 3)
RETURNS TABLE (user_prompt text, ai_response text, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_prompt, p.ai_response, 1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.ai_playbook p
  WHERE p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_ai_playbook(vector, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_ai_playbook(vector, int) TO service_role;