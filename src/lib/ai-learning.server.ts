/**
 * Continuous learning pipeline for the chat stand-in.
 *
 * Every generated turn is logged as a dialogue pair. When the customer replies
 * we score the turn on retention signals (reply, session length, purchase) and
 * promote the strongest ones into a vector-searchable playbook that is fed back
 * into future prompts.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const PROMOTE_AT = 60;

function key() {
  return process.env["LOVABLE_API_KEY"] ?? null;
}

async function embed(text: string): Promise<number[] | null> {
  const apiKey = key();
  if (!apiKey || !text.trim()) return null;
  try {
    const res = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 4000) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { embedding?: number[] }[] };
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/** Retrieves the closest high-performing example turns for a customer message. */
export async function retrieveExamples(userPrompt: string, limit = 3) {
  const vector = await embed(userPrompt);
  if (!vector) return [] as { user_prompt: string; ai_response: string }[];
  const { data } = await supabaseAdmin.rpc("match_ai_playbook", {
    query_embedding: vector as unknown as string,
    match_count: limit,
  });
  return (data ?? []) as { user_prompt: string; ai_response: string; similarity: number }[];
}

/** Logs one (customer message → stand-in reply) pair. */
export async function logInteraction(input: {
  sessionId: string;
  personaId: string | null;
  personaName: string;
  userPrompt: string;
  aiResponse: string;
}) {
  await supabaseAdmin.from("ai_interactions").insert({
    session_id: input.sessionId,
    persona_id: input.personaId,
    persona_name: input.personaName,
    user_prompt: input.userPrompt,
    ai_response: input.aiResponse,
  });
}

export function engagementScore(input: {
  replied: boolean;
  durationSeconds: number;
  creditPurchased: boolean;
}) {
  let score = 0;
  if (input.replied) score += 40;
  score += Math.min(30, Math.round(input.durationSeconds / 60) * 6);
  if (input.creditPurchased) score += 30;
  return Math.min(100, score);
}

/**
 * Called when the customer sends a message: the previous stand-in turn earned a
 * reply, so it is scored and — when strong — promoted into the playbook.
 */
export async function markUserReplied(sessionId: string, clientId: string) {
  const { data: pending } = await supabaseAdmin
    .from("ai_interactions")
    .select("id, user_prompt, ai_response, persona_name, created_at")
    .eq("session_id", sessionId)
    .eq("user_replied", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pending) return;

  const { data: session } = await supabaseAdmin
    .from("chat_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .maybeSingle();

  const startedAt = session?.started_at ? Date.parse(session.started_at) : Date.now();
  const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

  const { data: purchases } = await supabaseAdmin
    .from("credit_transactions")
    .select("id")
    .eq("user_id", clientId)
    .eq("kind", "purchase")
    .gte("created_at", new Date(startedAt).toISOString())
    .limit(1);
  const creditPurchased = (purchases ?? []).length > 0;

  const score = engagementScore({ replied: true, durationSeconds, creditPurchased });

  await supabaseAdmin
    .from("ai_interactions")
    .update({
      user_replied: true,
      replied_at: new Date().toISOString(),
      session_duration_seconds: durationSeconds,
      credit_purchased: creditPurchased,
      engagement_score: score,
      promoted: score >= PROMOTE_AT,
    })
    .eq("id", pending.id);

  if (score < PROMOTE_AT || !pending.user_prompt.trim()) return;

  const vector = await embed(pending.user_prompt);
  await supabaseAdmin.from("ai_playbook").insert({
    interaction_id: pending.id,
    persona_name: pending.persona_name,
    user_prompt: pending.user_prompt,
    ai_response: pending.ai_response,
    engagement_score: score,
    model_version: EMBEDDING_MODEL,
    embedding: vector as unknown as string,
  });
}
