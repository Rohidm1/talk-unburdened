export type CreditPackageKey = "starter" | "deep" | "value";

export type CreditPackageDef = {
  key: CreditPackageKey;
  priceId: string;
  minutes: number;
  cents: number;
};

export const CREDIT_PACKAGES: Record<CreditPackageKey, CreditPackageDef> = {
  starter: { key: "starter", priceId: "credits_starter_eur", minutes: 15, cents: 1800 },
  deep: { key: "deep", priceId: "credits_deep_eur", minutes: 45, cents: 4900 },
  value: { key: "value", priceId: "credits_value_eur", minutes: 90, cents: 8900 },
};

export const PACKAGE_BY_PRICE_ID: Record<string, CreditPackageDef> = Object.fromEntries(
  Object.values(CREDIT_PACKAGES).map((p) => [p.priceId, p]),
);
