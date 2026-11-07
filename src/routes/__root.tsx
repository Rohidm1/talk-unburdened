import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  redirect,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { jsonLd, organizationSchema } from "@/lib/seo";
import { dailyTheme } from "@/lib/daily-theme";
import { isPortalAddress, shouldRedirectToPortal } from "@/lib/portal-host";

import appCss from "../styles.css?url";
import i18n from "@/lib/i18n";
import { I18nextProvider } from "react-i18next";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { VisitTracker } from "@/components/site/VisitTracker";
import { GoogleAdsTag } from "@/components/site/GoogleAdsTag";
import { BottomNav } from "@/components/site/BottomNav";
import { ConsentBanner } from "@/components/site/ConsentBanner";
import { GlobalPaywall } from "@/components/site/GlobalPaywall";
import { getConsent } from "@/lib/consent";
import { SafeBoundary } from "@/components/site/SafeBoundary";
import { SosOverlay } from "@/components/site/SosOverlay";
import { SafetyPrompt } from "@/components/site/SafetyPrompt";
import { WelcomeGate } from "@/components/site/WelcomeGate";
import { NetworkStatus } from "@/components/site/NetworkStatus";
import { AmbientTheme } from "@/components/site/AmbientTheme";
import { ReportDialog } from "@/components/site/ReportDialog";
import { ReferralRedeemer } from "@/components/site/ReferralRedeemer";
import { WellnessReminder } from "@/components/site/WellnessReminder";

function NotFoundComponent() {
  const portal = isPortalAddress();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {portal ? "This page isn't part of the portal" : "Page not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {portal
            ? "The team workspace has its own pages. Open the sign-in to continue."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-6">
          {portal ? (
            <Link
              to="/crm-login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to sign-in
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // Self-heal: a stale app version (missing file after an update) reloads once.
    const msg = String((error as Error)?.message ?? "");
    if (/dynamically imported module|Loading chunk|Importing a module script failed/i.test(msg)) {
      if (sessionStorage.getItem("at.healed") !== "1") {
        sessionStorage.setItem("at.healed", "1");
        window.location.reload();
      }
      return undefined;
    }
    // Otherwise retry the page automatically once after a short pause.
    if (sessionStorage.getItem("at.retried") !== window.location.pathname) {
      sessionStorage.setItem("at.retried", window.location.pathname);
      const t = window.setTimeout(() => {
        router.invalidate();
        reset();
      }, 1500);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [error, reset, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // The portal address serves the team workspace only: any customer page opened
  // there goes to the portal sign-in instead of rendering customer content.
  beforeLoad: ({ location }) => {
    if (shouldRedirectToPortal(location.pathname)) {
      throw redirect({ to: "/crm-login", replace: true });
    }
  },
  head: () => {
    const portal = isPortalAddress();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "author", content: portal ? "Open Ear" : "Anontalk" },
        {
          name: "robots",
          content: portal ? "noindex, nofollow" : "index, follow, max-image-preview:large",
        },
        { name: "theme-color", content: "#0b1220" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: portal ? "Open Ear" : "Anontalk" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { property: "og:site_name", content: portal ? "Open Ear" : "Anontalk" },
        { property: "og:locale", content: "en_US" },
        ...(portal
          ? []
          : [
              {
                name: "google-site-verification",
                content: "ZPvCJoja56guGnmJfVoQXXyRuSJL283iMVQXMdgu3Ho",
              },
            ]),
        { property: "og:type", content: "website" },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Manrope:wght@400;500;600&display=swap",
        },
        { rel: "icon", href: "/favicon.png", type: "image/png" },
        ...(portal
          ? []
          : [
              { rel: "manifest", href: "/manifest.webmanifest" },
              { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
            ]),
      ],
      scripts: portal ? [] : [jsonLd(organizationSchema)],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // The translation widget is a customer-site feature; the portal never loads it.
  const portal = isPortalAddress();
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {portal ? null : (
          <>
            <script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js" />
            <script
              type="text/javascript"
              dangerouslySetInnerHTML={{
                __html: "Weglot.initialize({ api_key: 'wg_3d2a5891af587e2610ff12a0d894db5c5' });",
              }}
            />
          </>
        )}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5982787822958728";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // AdSense auto-ads inject markup into <body>; loading the script only after
  // hydration keeps the server HTML and the first client render identical.
  // Ads load only after the visitor accepts cookies (GDPR).
  useEffect(() => {
    const load = () => {
      if (isPortalAddress()) return;
      if (getConsent() !== "accepted") return;
      if (document.querySelector(`script[src="${ADSENSE_SRC}"]`)) return;
      const s = document.createElement("script");
      s.src = ADSENSE_SRC;
      s.async = true;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    };
    load();
    window.addEventListener("at:consent", load);
    return () => window.removeEventListener("at:consent", load);
  }, []);

  useEffect(() => {
    document.documentElement.dataset["daily"] = dailyTheme();
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <SafeBoundary name="ambient"><AmbientTheme /></SafeBoundary>
        <Outlet />
        <Toaster />
        <SafeBoundary name="visit-tracker"><SiteOnly><VisitTracker /></SiteOnly></SafeBoundary>
        <SafeBoundary name="google-ads"><SiteOnly><GoogleAdsTag /></SiteOnly></SafeBoundary>
        <PublicOnly>
          <SafeBoundary name="paywall"><GlobalPaywall /></SafeBoundary>
          <SafeBoundary name="bottom-nav"><BottomNav /></SafeBoundary>
          <SafeBoundary name="safety"><SafetyPrompt /><ReportDialog /><SosOverlay /></SafeBoundary>
          <SafeBoundary name="referral"><ReferralRedeemer /><WellnessReminder /></SafeBoundary>
          <SafeBoundary name="welcome"><WelcomeGate /></SafeBoundary>
        </PublicOnly>
        <SafeBoundary name="network"><NetworkStatus /></SafeBoundary>
        <SafeBoundary name="consent"><SiteOnly><ConsentBanner /></SiteOnly></SafeBoundary>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

/** Customer pop-ups (welcome, paywall, SOS, bottom bar) never show inside the team portal. */
function PublicOnly({ children }: { children: import("react").ReactNode }) {
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  if (isPortalAddress()) return null;
  if (pathname.startsWith("/crm")) return null;
  return <>{children}</>;
}

/** Visitor counting, ad tags and the cookie banner belong to the customer site only. */
function SiteOnly({ children }: { children: import("react").ReactNode }) {
  if (isPortalAddress()) return null;
  return <>{children}</>;
}
