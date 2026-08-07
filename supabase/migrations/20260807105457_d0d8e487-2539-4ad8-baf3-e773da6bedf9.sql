ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calls_agent_open ON public.calls(agent_user_id) WHERE ended_at IS NULL;

DROP POLICY IF EXISTS "Calls visible to client, listener or admin" ON public.calls;
CREATE POLICY "Calls visible to client, agent, listener or admin"
ON public.calls FOR SELECT TO authenticated
USING (
  auth.uid() = client_id
  OR auth.uid() = agent_user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.listeners l
    WHERE l.id = calls.listener_id AND l.user_id = auth.uid()
  )
);