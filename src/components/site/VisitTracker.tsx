import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getConsent } from "@/lib/consent";

const KEY = "anontalk_visitor_id";

function visitorId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Records anonymous page visits (country comes from the edge request headers). */
export function VisitTracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const sync = () => setConsented(getConsent() === "accepted");
    sync();
    window.addEventListener("at:consent", sync);
    return () => window.removeEventListener("at:consent", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !consented) return;
    if (path.startsWith("/api")) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const token = data.session?.access_token;
        await fetch("/api/public/track", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            visitorId: visitorId(),
            path,
            referrer: document.referrer,
          }),
          keepalive: true,
        });
      } catch {
        /* tracking must never break the page */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path, consented]);

  return null;
}