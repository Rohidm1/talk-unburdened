const PUBLISHED_ORIGIN = "https://talk-unburdened.lovable.app";
const CUSTOMER_ORIGIN = "https://anontalk.online";

/** Keep custom-domain coverage intact while providing the published site's own sitemap. */
export function sitemapOrigin(requestUrl: string): string {
  return new URL(requestUrl).origin === PUBLISHED_ORIGIN ? PUBLISHED_ORIGIN : CUSTOMER_ORIGIN;
}