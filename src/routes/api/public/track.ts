import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isTrackablePath } from "@/lib/tracking-paths";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

function countryFrom(request: Request) {
  const h = request.headers;
  return (
    h.get("cf-ipcountry") ??
    h.get("x-vercel-ip-country") ??
    h.get("x-country-code") ??
    null
  );
}

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            visitorId?: string;
            path?: string;
            referrer?: string;
          };
          const visitorId = (body.visitorId ?? "").slice(0, 64);
          if (!visitorId) return new Response("ok");
          if (!isTrackablePath(body.path ?? "/")) return new Response("ok");

          const supabase = getSupabase();
          const country = countryFrom(request);

          let userId: string | null = null;
          const auth = request.headers.get("authorization");
          if (auth?.startsWith("Bearer ")) {
            const { data } = await supabase.auth.getUser(auth.slice(7));
            userId = data.user?.id ?? null;
          }

          await supabase.from("site_visits").insert({
            visitor_id: visitorId,
            country,
            path: (body.path ?? "/").slice(0, 200),
            referrer: (body.referrer ?? "").slice(0, 300) || null,
            user_id: userId,
          });

          if (userId && country) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, signup_country")
              .eq("id", userId)
              .maybeSingle();
            if (profile && !profile.signup_country) {
              await supabase.from("profiles").update({ signup_country: country }).eq("id", userId);
            }
          }
        } catch (error) {
          console.error("[track] failed", error);
        }
        return new Response("ok");
      },
    },
  },
});