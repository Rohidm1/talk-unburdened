import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublicDilemmas } from "@/lib/dilemma-public.functions";
import { pageHead } from "@/lib/seo";
import { DilemmaExperience } from "@/components/site/DilemmaExperience";

const publicDilemmasQuery = queryOptions({ queryKey: ["public-dilemmas"], queryFn: () => listPublicDilemmas() });

export const Route = createFileRoute("/dilemma")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicDilemmasQuery),
  head: () => pageHead({ title: "Daily Dilemmas & Difficult Choices | Anontalk", description: "Explore public dilemmas about everyday choices. Read without an account; sign in to vote under your nickname and discuss both sides.", path: "/dilemma" }),
  component: DilemmaPage,
});

function DilemmaPage() {
  const { data } = useSuspenseQuery(publicDilemmasQuery);
  return <DilemmaExperience dilemma={data[0] ?? null} archive={data} />;
}
