import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { hasVerifiedEmail } from "@/lib/account-access";

// Run after the integration-owned token attacher. Public read functions remain public.
export const verifyAccount = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const authorization = getRequest().headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.getUser(authorization.slice(7));
    if (error || !hasVerifiedEmail(data.user)) {
      throw new Error("Please verify your email before continuing.");
    }
  }
  return next();
});