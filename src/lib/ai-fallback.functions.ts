import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SYSTEM_PROMPT,
  checkReplyGuardrails,
  chunkReply,
  maybeInjectTypo,
  personaPromptFor,
} from "@/lib/ai-persona";

const sessionInput = (input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input);

const replyInput = (input: unknown) =>
  z
    .object({
      sessionId: z.string().uuid(),
      kind: z.enum(["reply", "opener"]).default("reply"),
    })
    .parse(input);

/** True when at least one human agent is marked online with a fresh heartbeat. */
async function hasLiveAgent(supabaseAdmin: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        c: string,
        v: string,
      ) => { gt: (c: string, v: string) => Promise<{ data: unknown[] | null }> };
    };
  };
}) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("agent_presence")
    .select("user_id")
    .eq("availability", "online")
    .gt("last_seen_at", since);
  return (data ?? []).length > 0;
}

export const requestAiReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(replyInput)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { retrieveExamples, logInteraction } = await import("@/lib/ai-learning.server");

    const skip = (reason: string) => ({ ok: false as const, reason, chunks: [] as string[] });

    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, client_id, listener_id, status, ended_at, answered_at, ai_muted")
      .eq("id", data.sessionId)
      .maybeSingle();

    if (!session || session.client_id !== context.userId) return skip("forbidden");
    if (session.ended_at || session.status === "ended") return skip("closed");
    if (session.ai_muted || session.answered_at) return skip("muted");
    if (await hasLiveAgent(supabaseAdmin as never)) return skip("agent_online");

    const { data: listener } = session.listener_id
      ? await supabaseAdmin
          .from("listeners")
          .select("display_name, languages")
          .eq("id", session.listener_id)
          .maybeSingle()
      : { data: null };
    const personaName = listener?.display_name ?? "your chat partner";
    const personaLanguages = listener?.languages ?? null;

    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("sender_role, body, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    const ordered = (history ?? []).slice().reverse();
    const lastUserMessage = [...ordered].reverse().find((m) => m.sender_role === "client")?.body;

    if (data.kind === "opener" && ordered.some((m) => m.sender_role === "client")) {
      return skip("not_needed");
    }

    // Retrieval-augmented: reuse the phrasing that historically kept people talking.
    const examples = lastUserMessage ? await retrieveExamples(lastUserMessage) : [];
    const examplesBlock = examples.length
      ? `\n\nExamples of replies that worked well before (match the style, never copy verbatim):\n${examples
          .map((e) => `- When someone said "${e.user_prompt}" a great reply was "${e.ai_response}"`)
          .join("\n")}`
      : "";

    const personaBlock = personaPromptFor(personaName, personaLanguages);
    const openerBlock =
      data.kind === "opener"
        ? `\n\nThe person just opened the chat and hasn't typed yet. Send one short, warm, natural opening line that invites them to share what's on their mind. Do not mention waiting, timers or the platform.`
        : "";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + personaBlock + examplesBlock + openerBlock },
      ...ordered.map((m) => ({
        role: m.sender_role === "client" ? "user" : "assistant",
        content: m.body,
      })),
    ];
    if (data.kind === "opener") {
      messages.push({ role: "user", content: "(the person just joined the chat)" });
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return skip("unavailable");

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({ model: "google/gemini-3.6-flash", messages }),
      });
      if (!res.ok) return skip(res.status === 429 ? "rate_limited" : "unavailable");
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) return skip("unavailable");

      const cleanChunks = chunkReply(text);
      if (cleanChunks.some((chunk) => !checkReplyGuardrails(chunk).ok)) return skip("unavailable");
      // Human quirk: now and then a small typo slips in, followed by a quick fix.
      const { chunks } = data.kind === "opener" ? { chunks: cleanChunks } : maybeInjectTypo(cleanChunks);

      await supabaseAdmin
        .from("chat_sessions")
        .update({ ai_active: true })
        .eq("id", data.sessionId)
        .eq("ai_muted", false);

      await logInteraction({
        sessionId: data.sessionId,
        personaId: session.listener_id ?? null,
        personaName,
        userPrompt: data.kind === "opener" ? "" : (lastUserMessage ?? ""),
        aiResponse: chunks.join(" "),
      });

      return { ok: true as const, reason: null, chunks };
    } catch {
      return skip("unavailable");
    }
  });

/** Writes one stand-in message, unless a human agent has taken over meanwhile. */
export const persistAiMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ sessionId: z.string().uuid(), body: z.string().trim().min(1).max(2000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, client_id, status, ended_at, answered_at, ai_muted")
      .eq("id", data.sessionId)
      .maybeSingle();

    if (!session || session.client_id !== context.userId) return { ok: false as const };
    if (session.ended_at || session.ai_muted || session.answered_at) return { ok: false as const };

    const { error } = await supabaseAdmin.from("chat_messages").insert({
      session_id: data.sessionId,
      sender_role: "agent",
      sender_user_id: null,
      is_ai: true,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
