import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleAds, reportVerifiedSignup } from "@/lib/google-ads";

/** Loads the Google Ads tag after consent and reports a freshly verified sign-up. */
export function GoogleAdsTag() {
  useEffect(() => {
    loadGoogleAds();
    const onConsent = () => {
      if (loadGoogleAds()) return;
      // Choice withdrawn while the tag is already on the page: stop ad signals now.
      window.gtag?.("consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    };
    window.addEventListener("at:consent", onConsent);
    void supabase.auth.getSession().then(({ data }) => reportVerifiedSignup(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      reportVerifiedSignup(session?.user);
    });
    return () => {
      window.removeEventListener("at:consent", onConsent);
      sub.subscription.unsubscribe();
    };
  }, []);
  return null;
}
