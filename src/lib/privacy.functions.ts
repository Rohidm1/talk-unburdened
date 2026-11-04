import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The signed-in user's credit history (purchases, bonuses and spends). */
export const getCreditHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("credit_transactions")
      .select("id, created_at, kind, credits_delta, amount_cents, payment_source")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Could not load your credit history.");
    return data ?? [];
  });

/**
 * Permanently deletes the caller's account and personal content (Google Play
 * account-deletion requirement). Team accounts are removed by an admin instead.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ confirm: z.literal("DELETE") }).parse(input))
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if ((roles ?? []).some((r) => r.role === "staff" || r.role === "admin")) {
      return { ok: false as const, error: "Team accounts can only be removed by an admin." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: contentError } = await supabaseAdmin.rpc("delete_user_content", { _user_id: context.userId });
    if (contentError) {
      console.error("[privacy] content deletion failed", contentError);
      return { ok: false as const, error: "Your data could not be deleted. Please try again." };
    }
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (authError) {
      console.error("[privacy] account deletion failed", authError);
      return { ok: false as const, error: "Your account could not be deleted. Please try again." };
    }
    return { ok: true as const };
  });
