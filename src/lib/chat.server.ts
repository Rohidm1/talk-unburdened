import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Confirms the session belongs to this agent and returns it. */
export async function loadAgentChat(sessionId: string, agentUserId: string) {
  const { data } = await supabaseAdmin
    .from("chat_sessions")
    .select(
      "id, client_id, listener_id, agent_user_id, status, mode, started_at, answered_at, ended_at",
    )
    .eq("id", sessionId)
    .eq("agent_user_id", agentUserId)
    .maybeSingle();
  return data ?? null;
}

/** Confirms the session belongs to this customer and returns it. */
export async function loadClientChat(sessionId: string, clientId: string) {
  const { data } = await supabaseAdmin
    .from("chat_sessions")
    .select("id, client_id, listener_id, agent_user_id, status, mode, answered_at, ended_at")
    .eq("id", sessionId)
    .eq("client_id", clientId)
    .maybeSingle();
  return data ?? null;
}

export { supabaseAdmin };

/** Append one line to the chronological audit trail of a chat. */
export async function logChatEvent(
  sessionId: string,
  event: string,
  actorRole: "client" | "agent" | "system" = "system",
  detail?: string | null,
) {
  await supabaseAdmin.from("chat_events").insert({
    session_id: sessionId,
    event,
    actor_role: actorRole,
    detail: detail ?? null,
  });
}
