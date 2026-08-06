export type CreditPackageKey = "starter" | "deep" | "value";

/** Single source of truth for pay-as-you-go pricing. */
export const RATE_CENTS_PER_MINUTE = 130;
export const RATE_PER_MINUTE = RATE_CENTS_PER_MINUTE / 100;

/** Free trial time granted once at signup (3 minutes). */
export const FREE_TRIAL_SECONDS = 180;
/** Hard cap for the free check-in call (5 minutes). */
export const FREE_CALL_MAX_SECONDS = 300;
/** Warn the caller when this little time is left. */
export const LOW_BALANCE_WARNING_SECONDS = 60;

export type CreditPackageDef = {
  key: CreditPackageKey;
  priceId: string;
  minutes: number;
  cents: number;
  popular?: boolean;
};

export const CREDIT_PACKAGES: Record<CreditPackageKey, CreditPackageDef> = {
  starter: { key: "starter", priceId: "credits_starter_eur", minutes: 15, cents: 1800 },
  deep: { key: "deep", priceId: "credits_deep_eur", minutes: 45, cents: 4900, popular: true },
  value: { key: "value", priceId: "credits_value_eur", minutes: 90, cents: 8900 },
};

export const CREDIT_PACKAGE_LIST: CreditPackageDef[] = [
  CREDIT_PACKAGES.starter,
  CREDIT_PACKAGES.deep,
  CREDIT_PACKAGES.value,
];

export const PACKAGE_BY_PRICE_ID: Record<string, CreditPackageDef> = Object.fromEntries(
  Object.values(CREDIT_PACKAGES).map((p) => [p.priceId, p]),
);
