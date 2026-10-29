import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isDilemmaId } from "@/lib/dilemma-public";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Public content configuration unavailable");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}

// Public prompts only: never fetch votes, authors, chat messages or arguments.
export async function readPublicDilemmas() {
  const client = publicClient();
  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from("dilemmas")
      .select("id, day, question, option_a, option_b").lte("day", today)
      .order("day", { ascending: false }).order("id").range(offset, offset + pageSize - 1);
    if (error) throw new Error("Could not load public dilemmas");
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function readPublicDilemma(id: string) {
  if (!isDilemmaId(id)) return null;
  const { data, error } = await publicClient().from("dilemmas")
    .select("id, day, question, option_a, option_b").eq("id", id)
    .lte("day", new Date().toISOString().slice(0, 10)).maybeSingle();
  if (error) throw new Error("Could not load this dilemma");
  return data;
}