import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function requireAdminClient(isAdmin: boolean) {
  if (!isAdmin) throw new Error("Forbidden");
  return supabaseAdmin;
}
