import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Celebration } from "@/components/site/Celebration";

export const REF_KEY = "at.ref";

/** After an invited friend signs in, redeem their invite once (5 credits each). */
export function ReferralRedeemer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const code = window.localStorage.getItem(REF_KEY);
    if (!code) return;
    void supabase.rpc("redeem_referral", { _code: code }).then(({ data, error }) => {
      if (error) return;
      if (data === "unverified") return; // try again once the email is confirmed
      window.localStorage.removeItem(REF_KEY);
      if (data === "ok") {
        setMsg("Welcome gift: +5 bonus credits from your friend's invite 💛");
        void qc.invalidateQueries({ queryKey: ["account"] });
      }
    });
  }, [user, qc]);

  return msg ? <Celebration message={msg} onDone={() => setMsg(null)} /> : null;
}
