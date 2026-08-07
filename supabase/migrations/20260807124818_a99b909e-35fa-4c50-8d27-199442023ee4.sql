ALTER TABLE public.call_notes
  ADD COLUMN IF NOT EXISTS chat_session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS call_notes_chat_session_id_idx ON public.call_notes (chat_session_id);
CREATE INDEX IF NOT EXISTS call_notes_client_author_idx ON public.call_notes (client_id, listener_user_id, created_at DESC);