import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Confirms that `agentUserId` is one of the real agents staffing the fictional
 * profile this call was placed to, and returns the call row.
 */
export async function loadAgentCall(callId: string, agentUserId: string) {
  const { data: call } = await supabaseAdmin
    .from("calls")
    .select("id, client_id, listener_id, mode, status, started_at, answered_at, ended_at")
    .eq("id", callId)
    .maybeSingle();
  if (!call) return null;

  const [{ data: link }, { data: listener }] = await Promise.all([
    supabaseAdmin
      .from("listener_agents")
      .select("agent_user_id")
      .eq("listener_id", call.listener_id)
      .eq("agent_user_id", agentUserId)
      .maybeSingle(),
    supabaseAdmin
      .from("listeners")
      .select("id, display_name, user_id")
      .eq("id", call.listener_id)
      .maybeSingle(),
  ]);

  if (!link && listener?.user_id !== agentUserId) return null;
  return { call, listener };
}

export { supabaseAdmin };
