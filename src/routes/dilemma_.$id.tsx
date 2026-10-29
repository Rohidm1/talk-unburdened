import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPublicDilemma } from "@/lib/dilemma-public.functions";
import { dilemmaSummary } from "@/lib/dilemma-public";
import { pageHead, jsonLd, SITE_URL } from "@/lib/seo";
import { DilemmaExperience } from "@/components/site/DilemmaExperience";

const dilemmaQuery = (id: string) => queryOptions({
  queryKey: ["public-dilemma", id], queryFn: () => getPublicDilemma({ data: { id } }),
});

export const Route = createFileRoute("/dilemma_/$id")({
  loader: async ({ context, params }) => {
    const dilemma = await context.queryClient.ensureQueryData(dilemmaQuery(params.id));
    if (!dilemma) throw notFound();
    return dilemma;
  },
  head: ({ loaderData, params }) => ({
    ...pageHead({
      title: loaderData ? `${loaderData.question} | Anontalk Dilemma` : "Dilemma unavailable | Anontalk",
      description: loaderData ? dilemmaSummary(loaderData) : "This public dilemma is unavailable.",
      path: `/dilemma/${params.id}`, noindex: !loaderData,
    }),
    scripts: loaderData ? [jsonLd({
      "@context": "https://schema.org", "@type": "WebPage",
      name: loaderData.question, description: dilemmaSummary(loaderData),
      url: `${SITE_URL}/dilemma/${loaderData.id}`, inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    })] : [],
  }),
  component: DilemmaDetail,
  notFoundComponent: DilemmaUnavailable,
});

function DilemmaDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(dilemmaQuery(id));
  return <DilemmaExperience dilemma={data} />;
}

function DilemmaUnavailable() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20">
      <h1 className="font-display text-3xl font-semibold">Dilemma unavailable</h1>
      <Link to="/dilemma" className="mt-5 inline-flex text-primary underline">Browse public dilemmas</Link>
    </main>
  );
}