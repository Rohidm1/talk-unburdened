import { createServerFn } from "@tanstack/react-start";

export const listPublicDilemmas = createServerFn({ method: "GET" }).handler(async () => {
  const { readPublicDilemmas } = await import("@/lib/dilemma-public.server");
  return readPublicDilemmas();
});

export const getPublicDilemma = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: typeof input.id === "string" ? input.id : "" }))
  .handler(async ({ data }) => {
    const { readPublicDilemma } = await import("@/lib/dilemma-public.server");
    return readPublicDilemma(data.id);
  });