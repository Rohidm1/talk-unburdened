CREATE OR REPLACE FUNCTION public.delete_user_content(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.ai_playbook WHERE interaction_id IN (
    SELECT i.id FROM public.ai_interactions i JOIN public.chat_sessions s ON s.id = i.session_id WHERE s.client_id = _user_id
  );
  DELETE FROM public.argument_votes WHERE user_id = _user_id;
  DELETE FROM public.dilemma_arguments WHERE user_id = _user_id;
  DELETE FROM public.dilemma_votes WHERE user_id = _user_id;
  DELETE FROM public.bottle_echoes WHERE user_id = _user_id;
  DELETE FROM public.bottles WHERE user_id = _user_id;
  UPDATE public.community_posts SET body = '[deleted]', alias = 'Deleted user', is_hidden = true,
    user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id = _user_id;
  DELETE FROM public.speed_queue WHERE user_id = _user_id;
  DELETE FROM public.speed_matches WHERE _user_id IN (user_a, user_b);
  DELETE FROM public.engagement_events WHERE user_id = _user_id;
  DELETE FROM public.support_tickets WHERE user_id = _user_id;
  DELETE FROM public.call_notes WHERE client_id = _user_id;
  DELETE FROM public.chat_sessions WHERE client_id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_user_content(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_content(uuid) TO service_role;