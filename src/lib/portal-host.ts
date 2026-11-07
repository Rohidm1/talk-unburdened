// The Open Ear team portal has its own address, separate from the customer site.
// On that address the app must only ever show the portal: no customer pages, no
// customer tracking, no customer branding.

import { getRequest } from "@tanstack/react-start/server";

/** Hosts that serve the Open Ear portal and nothing else. */
export const PORTAL_HOSTS = ["openearteam.com", "www.openearteam.com"] as const;

/** Paths that belong to the portal. Everything else is customer-facing. */
export function isPortalPath(pathname: string): boolean {
  return pathname === "/crm" || pathname === "/crm/" || pathname.startsWith("/crm/") || pathname.startsWith("/crm-login");
}

/** Strip an optional port and normalise case so header values compare cleanly. */
function normaliseHost(value: string | null | undefined): string | null {
  if (!value) return null;
  const host = value.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return null;
  // Drop a trailing :port, but never touch a hostname containing a colon inside brackets.
  return host.startsWith("[") ? host : host.replace(/:\d+$/, "");
}

/** True only for the portal's own hosts — never for look-alikes such as openearteam.com.evil.test. */
export function isPortalHost(host: string | null | undefined): boolean {
  const h = normaliseHost(host);
  if (!h) return false;
  return (PORTAL_HOSTS as readonly string[]).includes(h);
}

/**
 * The address this page is being served from.
 * Works in the browser and during server rendering; returns null when neither
 * can be determined so callers fall back to the customer site.
 */
export function currentHost(): string | null {
  if (typeof window !== "undefined") {
    return normaliseHost(window.location.hostname) ?? null;
  }
  try {
    const request = getRequest();
    return normaliseHost(request.headers.get("host")) ?? normaliseHost(new URL(request.url).hostname);
  } catch {
    return null;
  }
}

/** True when the current address is the portal's own address. */
export function isPortalAddress(): boolean {
  return isPortalHost(currentHost());
}

/**
 * A non-portal page opened on the portal address must not render customer
 * content: it belongs at the portal sign-in instead.
 */
export function shouldRedirectToPortal(pathname: string): boolean {
  return isPortalAddress() && !isPortalPath(pathname);
}
