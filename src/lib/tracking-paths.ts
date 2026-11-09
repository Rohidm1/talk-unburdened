// Visit analytics only count public visitor pages, never team/admin screens.
const EXCLUDED_PREFIXES = ["/crm", "/admin", "/api", "/checkout/return"];

export function isTrackablePath(pathname: string): boolean {
  const p = (pathname || "/").toLowerCase().split(/[?#]/)[0];
  return !EXCLUDED_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/") || p.startsWith(pre + "-") || p.startsWith(pre));
}
