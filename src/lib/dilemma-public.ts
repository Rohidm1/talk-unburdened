export type PublicDilemma = { id: string; day: string; question: string; option_a: string; option_b: string };
export const isDilemmaId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const publishedDilemmas = (rows: PublicDilemma[], today: string) => rows.filter((row) => row.day <= today);
export const dilemmaSummary = (d: PublicDilemma) => `${d.question} Choose between ${d.option_a} and ${d.option_b}. Read the dilemma freely; sign in to vote and join the discussion.`;