export const SITE_URL = "https://anontalk.online";

export type Answer = { question: string; answer: string };

export function pageHead({ title, description, path, type = "website", language = "en", noindex = false }: {
  title: string; description: string; path: string; type?: string; language?: string; noindex?: boolean;
}) {
  const url = new URL(path, SITE_URL).href;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:locale", content: language === "nl" ? "nl_NL" : "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function jsonLd(schema: Record<string, unknown>) {
  return { type: "application/ld+json", children: JSON.stringify(schema).replace(/</g, "\\u003c") };
}

export function faqSchema(answers: readonly Answer[]) {
  return {
    "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "nl",
    mainEntity: answers.map(({ question, answer }) => ({
      "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export const organizationSchema = {
  "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE_URL}/#organization`,
  name: "Anontalk", url: SITE_URL,
};

export function websiteSchema(description: string) {
  return {
    "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`,
    name: "Anontalk", url: SITE_URL, description, inLanguage: ["en", "nl"],
    publisher: { "@id": organizationSchema["@id"] },
  };
}

export function blogSchema(post: { slug: string; title: string; excerpt: string; date: string }) {
  const url = `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`;
  return {
    "@context": "https://schema.org", "@type": "BlogPosting", "@id": `${url}#article`,
    headline: post.title, description: post.excerpt, datePublished: post.date, inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "Anontalk", url: SITE_URL },
    publisher: { "@id": organizationSchema["@id"] },
  };
}