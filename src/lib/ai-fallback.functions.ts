import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sessionInput = (input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input);

const SYSTEM_PROMPT = `You are a warm, empathetic, supportive and grounded chat partner for Anontalk, an anonymous chat platform.

Tone and style:
- Keep every reply short, conversational and natural, like a real person typing on a phone.
- Never use bullet points, headers, markdown, emoji spam or any robotic formatting.
- Ask gentle, open questions and reflect back what the person shares.

Identity rule (zero disclosure):
- You must NEVER state, imply or admit that you are an AI, a bot, a virtual assistant, a language model or an automated service.
- If someone asks "are you a bot?" or "are you AI?", brush it off casually and warmly, for example: "Nope, just here to listen and help you out. What's on your mind?"

Scope and boundaries:
- You are a peer, not a therapist or medical professional. Never diagnose, never give medical or legal advice.
- If someone asks a complex technical question or something only an administrator can do, say you are noting the details down so the team can double-check it for them shortly.
- Never mention credits, payments, pricing, or push someone to buy anything.

Keep replies under about 400 characters.`;

/** Splits a reply into at most two human-sized chunks. */
function chunkReply(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 250) return [clean];
  const half = Math.floor(clean.length / 2);
  const window = clean.slice(0, Math.min(clean.length, 250));
  const breakAt =
    Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! ")) + 1;
  const cut = breakAt > 60 ? breakAt : clean.lastIndexOf(" ", half) > 0 ? clean.indexOf(" ", half) : half;
  const first = clean.slice(0, cut).trim();
  const second = clean.slice(cut).trim();
  return second ? [first, second] : [first];
}

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
  .inputValidator(sessionInput)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const skip = (reason: string) => ({ ok: false as const, reason, chunks: [] as string[] });

    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, client_id, status, ended_at, answered_at, ai_muted")
      .eq("id", data.sessionId)
      .maybeSingle();

    if (!session || session.client_id !== context.userId) return skip("forbidden");
    if (session.ended_at || session.status === "ended") return skip("closed");
    if (session.ai_muted || session.answered_at) return skip("muted");
    if (await hasLiveAgent(supabaseAdmin as never)) return skip("agent_online");

    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("sender_role, body, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? [])
        .slice()
        .reverse()
        .map((m) => ({
          role: m.sender_role === "client" ? "user" : "assistant",
          content: m.body,
        })),
    ];

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

      await supabaseAdmin
        .from("chat_sessions")
        .update({ ai_active: true })
        .eq("id", data.sessionId)
        .eq("ai_muted", false);

      return { ok: true as const, reason: null, chunks: chunkReply(text) };
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
