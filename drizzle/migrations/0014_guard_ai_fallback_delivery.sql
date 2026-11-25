CREATE TABLE public.ai_reply_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE, message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(session_id,message_id));
GRANT ALL ON public.ai_reply_jobs TO service_role;
ALTER TABLE public.ai_reply_jobs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.ai_fallback_allowed(_session_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.chat_sessions s WHERE s.id=_session_id AND s.ended_at IS NULL AND s.answered_at IS NULL AND NOT s.ai_muted AND s.agent_user_id IS NULL AND s.status IN ('queued','ringing')) AND COALESCE((SELECT value='true' FROM public.app_settings WHERE key='ai_fallback_enabled'),true) AND NOT EXISTS(SELECT 1 FROM public.app_settings WHERE key='ai_fallback_paused' AND value<>'') AND NOT EXISTS(SELECT 1 FROM public.agent_presence p JOIN public.user_roles r ON r.user_id=p.user_id AND r.role IN ('staff','admin') WHERE p.availability='available' AND p.last_seen_at>now()-interval '60 seconds' AND p.active_chat_count<2);
$$;
CREATE OR REPLACE FUNCTION public.reserve_ai_reply(_session_id uuid, _client_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE mid uuid; jid uuid;
BEGIN
PERFORM 1 FROM public.chat_sessions WHERE id=_session_id AND client_id=_client_id FOR UPDATE;
IF NOT FOUND OR NOT public.ai_fallback_allowed(_session_id) THEN RETURN NULL; END IF;
SELECT id INTO mid FROM public.chat_messages WHERE session_id=_session_id AND sender_role='client' ORDER BY created_at DESC,id DESC LIMIT 1;
IF mid IS NULL THEN RETURN NULL; END IF;
INSERT INTO public.ai_reply_jobs(session_id,message_id) VALUES(_session_id,mid) ON CONFLICT DO NOTHING RETURNING id INTO jid;
RETURN jid;
END; $$;
CREATE OR REPLACE FUNCTION public.deliver_ai_reply(_job_id uuid, _body text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job public.ai_reply_jobs;
BEGIN
SELECT * INTO job FROM public.ai_reply_jobs WHERE id=_job_id AND status='pending' FOR UPDATE;
IF NOT FOUND THEN RETURN false; END IF;
PERFORM 1 FROM public.chat_sessions WHERE id=job.session_id FOR UPDATE;
IF NOT public.ai_fallback_allowed(job.session_id) OR length(trim(_body))=0 OR length(_body)>2000 OR EXISTS(SELECT 1 FROM public.chat_messages m JOIN public.chat_messages anchor ON anchor.id=job.message_id WHERE m.session_id=job.session_id AND m.sender_role='client' AND m.created_at>anchor.created_at) THEN UPDATE public.ai_reply_jobs SET status='failed' WHERE id=job.id; RETURN false; END IF;
INSERT INTO public.chat_messages(session_id,sender_role,sender_user_id,is_ai,body) VALUES(job.session_id,'agent',NULL,true,_body);
UPDATE public.chat_sessions SET ai_active=true WHERE id=job.session_id;
UPDATE public.ai_reply_jobs SET status='sent' WHERE id=job.id;
RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.ai_fallback_allowed(uuid),public.reserve_ai_reply(uuid,uuid),public.deliver_ai_reply(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai_fallback_allowed(uuid),public.reserve_ai_reply(uuid,uuid),public.deliver_ai_reply(uuid,text) TO service_role;