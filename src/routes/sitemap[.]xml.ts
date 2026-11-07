import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { blogPosts } from "@/data/blog";
import { sitemapOrigin } from "@/lib/sitemap-origin";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = sitemapOrigin(request.url);
        const { readPublicDilemmas } = await import("@/lib/dilemma-public.server");
        const dilemmas = await readPublicDilemmas();
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/talk-to-strangers", changefreq: "weekly", priority: "0.9" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/hub", changefreq: "weekly", priority: "0.7" },
          { path: "/speed-chat", changefreq: "weekly", priority: "0.7" },
          { path: "/community", changefreq: "daily", priority: "0.7" },
          { path: "/bottles", changefreq: "daily", priority: "0.7" },
          { path: "/dilemma", changefreq: "daily", priority: "0.7" },
          { path: "/wellness", changefreq: "monthly", priority: "0.7" },
          { path: "/help", changefreq: "monthly", priority: "0.6" },
          { path: "/buddies", changefreq: "monthly", priority: "0.4" },
          { path: "/privacy", changefreq: "monthly", priority: "0.3" },
          { path: "/terms", changefreq: "monthly", priority: "0.3" },
          { path: "/cookies", changefreq: "monthly", priority: "0.3" },
          { path: "/guidelines", changefreq: "monthly", priority: "0.3" },
          { path: "/delete-account", changefreq: "monthly", priority: "0.3" },
          ...blogPosts.map((post) => ({
            path: `/blog/${post.slug}`,
            changefreq: "monthly" as const,
            priority: "0.6",
          })),
          ...dilemmas.map((dilemma) => ({ path: `/dilemma/${dilemma.id}`, changefreq: "monthly" as const, priority: "0.6" })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${baseUrl}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
