import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { SupportWidget } from "@/components/site/SupportWidget";
import { jsonLd, organizationSchema } from "@/lib/seo";
import { dailyTheme } from "@/lib/daily-theme";

import appCss from "../styles.css?url";
import i18n from "@/lib/i18n";
import { I18nextProvider } from "react-i18next";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { VisitTracker } from "@/components/site/VisitTracker";
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "author", content: "Anontalk" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "theme-color", content: "#0b1220" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Anontalk" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:site_name", content: "Anontalk" },
      { property: "og:locale", content: "en_US" },
      {
        name: "google-site-verification",
        content: "ZPvCJoja56guGnmJfVoQXXyRuSJL283iMVQXMdgu3Ho",
      },
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
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
    scripts: [jsonLd(organizationSchema)],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: "Weglot.initialize({ api_key: 'wg_3d2a5891af587e2610ff12a0d894db5c5' });",
          }}
        />
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
        <SafeBoundary name="visit-tracker"><VisitTracker /></SafeBoundary>
        <SafeBoundary name="support-widget"><SupportWidget /></SafeBoundary>
        <SafeBoundary name="paywall"><GlobalPaywall /></SafeBoundary>
        <SafeBoundary name="bottom-nav"><BottomNav /></SafeBoundary>
        <SafeBoundary name="safety"><SafetyPrompt /><ReportDialog /><SosOverlay /></SafeBoundary>
        <SafeBoundary name="network"><NetworkStatus /></SafeBoundary>
        <SafeBoundary name="referral"><ReferralRedeemer /><WellnessReminder /></SafeBoundary>
        <SafeBoundary name="welcome"><WelcomeGate /><ConsentBanner /></SafeBoundary>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
