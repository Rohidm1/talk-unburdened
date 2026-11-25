import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SYSTEM_PROMPT, checkReplyGuardrails, personaPromptFor } from "@/lib/ai-persona";

/** Delivery is controlled durably by the admin setting and guarded database RPCs. */
export const AI_REPLIES_ENABLED = true;

export const requestAiReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid(), kind: z.enum(["reply", "opener"]).default("reply") }).parse(input))
  .handler(async ({ data, context }) => {
    const skip = (reason: string) => ({ ok: false as const, reason, chunks: [] as string[] });
    // No unsolicited openers: only reply to a persisted customer message.
    if (data.kind === "opener") return skip("not_needed");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return skip("configuration");
    const { data: jobId, error: reserveError } = await admin.rpc("reserve_ai_reply", { _session_id: data.sessionId, _client_id: context.userId });
    if (reserveError) throw new Error("Could not check reply availability");
    if (!jobId) return skip("not_needed");
    const fail = async (reason: string) => {
      await admin.from("ai_reply_jobs").update({ status: "failed" }).eq("id", jobId);
      return skip(reason);
    };
    const { data: session } = await admin.from("chat_sessions").select("listener_id").eq("id", data.sessionId).single();
    const { data: listener } = session?.listener_id
      ? await admin.from("listeners").select("display_name,languages").eq("id", session.listener_id).maybeSingle()
      : { data: null };
    // Full session history only; never retrieve another customer's private conversation.
    const history: { sender_role: string; body: string }[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data: rows, error } = await admin.from("chat_messages").select("sender_role,body").eq("session_id", data.sessionId).order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 499);
      if (error) return fail("unavailable");
      history.push(...(rows ?? []));
      if (!rows || rows.length < 500) break;
    }
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + personaPromptFor(listener?.display_name ?? "your chat partner", listener?.languages) },
      ...history.map((m) => ({ role: m.sender_role === "client" ? "user" : "assistant", content: m.body })),
    ];
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({ model: "google/gemini-3.8-flash", messages }),
      });
      if (!res.ok) {
        // Terminal access and credit failures pause all automatic entry points durably.
        if ([401, 402, 403, 404].includes(res.status)) {
          await admin.from("app_settings").upsert({ key: "ai_fallback_paused", value: `AI service paused (${res.status}). Check service access and credits, then re-enable fallback.`, updated_at: new Date().toISOString() });
        }
        return fail(res.status === 429 ? "rate_limited" : "unavailable");
      }
      const json = await res.json() as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text || !checkReplyGuardrails(text).ok) return fail("unavailable");
      // Atomic recheck catches takeover, admin switch-off and a newer customer turn.
      const { data: delivered, error } = await admin.rpc("deliver_ai_reply", { _job_id: jobId, _body: text });
      if (error) return fail("unavailable");
      return delivered ? { ok: true as const, reason: null, chunks: [text] } : skip("not_needed");
    } catch {
      return fail("unavailable");
    }
  });
