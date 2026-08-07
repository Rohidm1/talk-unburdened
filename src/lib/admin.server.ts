import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Every admin server function funnels through here before touching admin rights. */
export function requireAdmin(isAdmin: boolean) {
  if (!isAdmin) throw new Error("Forbidden");
  return supabaseAdmin;
}

export { supabaseAdmin };
