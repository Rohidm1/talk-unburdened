import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleAds, reportVerifiedSignup } from "@/lib/google-ads";
import { CONSENT_KEY, CONSENT_HISTORY_KEY } from "@/lib/consent";

/** Loads the Google Ads tag after consent and reports a freshly verified sign-up. */
export function GoogleAdsTag() {
  useEffect(() => {
    loadGoogleAds();
    const onConsent = () => { loadGoogleAds(); };
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === null || event.key === CONSENT_KEY || event.key === CONSENT_HISTORY_KEY) {
        // Notify all consent consumers, not just the advertising tag.
        window.dispatchEvent(new CustomEvent("at:consent"));
      }
    };
    window.addEventListener("at:consent", onConsent);
    window.addEventListener("storage", onStorage);
    void supabase.auth.getSession().then(({ data }) => reportVerifiedSignup(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      reportVerifiedSignup(session?.user);
    });
    return () => {
      window.removeEventListener("at:consent", onConsent);
      window.removeEventListener("storage", onStorage);
      sub.subscription.unsubscribe();
    };
  }, []);
  return null;
}
