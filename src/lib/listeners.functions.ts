import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ListenerRow = Database["public"]["Tables"]["listeners"]["Row"];

export const listPublicListeners = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const { data, error } = await client
    .from("listeners")
    .select(
      "id, display_name, avatar_key, bio_en, bio_nl, languages, topics_en, topics_nl, status, years",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return data ?? [];
});
