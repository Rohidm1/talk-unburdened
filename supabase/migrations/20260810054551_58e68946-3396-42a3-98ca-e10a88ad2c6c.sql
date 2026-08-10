ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS ai_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_muted boolean NOT NULL DEFAULT false;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_ai boolean NOT NULL DEFAULT false;

ALTER TABLE public.chat_messages ALTER COLUMN sender_user_id DROP NOT NULL;