import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAccessToken, signDialAuth, twilioConfig } from "@/lib/voice.server";

export const getVoiceToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = await createAccessToken(context.userId);
    return { token, identity: context.userId, configured: !!token };
  });

export const prepareDial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ listenerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!twilioConfig()) return { ready: false as const, toIdentity: null, dialAuth: null };

    const { data: listener } = await context.supabase
      .from("listeners")
      .select("user_id")
      .eq("id", data.listenerId)
      .maybeSingle();

    const toIdentity = listener?.user_id ?? null;
    if (!toIdentity) return { ready: false as const, toIdentity: null, dialAuth: null };

    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const dialAuth = await signDialAuth(context.userId, toIdentity, expiresAt);
    return { ready: true as const, toIdentity, dialAuth };
  });