export type CreditPackageKey = "starter" | "popular" | "pro_value" | "vip_club";

/** Chat credit bundles: each customer message consumes one credit. */
export const RATE_CENTS_PER_MESSAGE = 0;
export const RATE_PER_MESSAGE = 0;

/** How many chats one agent may run at the same time. */
export const MAX_CHATS_PER_AGENT = 2;

/** Free credits granted at signup (5 messages). */
export const FREE_TRIAL_MESSAGES = 5;
/** Warn the customer when this little credit is left. */
export const LOW_BALANCE_WARNING_CREDITS = 2;

export type CreditPackageDef = {
  key: CreditPackageKey;
  priceId: string;
  /** Paid credits in the bundle. */
  credits: number;
  /** Extra free credits granted on top of `credits` with every purchase. */
  bonus: number;
  cents: number;
  /** Google Play in-app product ID (one-time consumable). */
  playProductId: string;
  popular?: boolean;
};

/** Total credits a buyer receives for a package (paid + bonus). */
export function totalCredits(p: Pick<CreditPackageDef, "credits" | "bonus">): number {
  return p.credits + p.bonus;
}

export const CREDIT_PACKAGES: Record<CreditPackageKey, CreditPackageDef> = {
  starter: {
    key: "starter",
    priceId: "chat_starter_usd",
    credits: 30,
    bonus: 0,
    playProductId: "credits_starter",
    cents: 999,
  },
  popular: {
    key: "popular",
    priceId: "chat_popular_usd",
    credits: 85,
    bonus: 15,
    playProductId: "credits_popular",
    cents: 2499,
    popular: true,
  },
  pro_value: {
    key: "pro_value",
    priceId: "chat_pro_value_usd",
    credits: 180,
    bonus: 40,
    playProductId: "credits_pro_value",
    cents: 4999,
  },
  vip_club: {
    key: "vip_club",
    priceId: "chat_vip_club_usd",
    credits: 400,
    bonus: 100,
    playProductId: "credits_vip_club",
    cents: 9999,
  },
};

export const CREDIT_PACKAGE_LIST: CreditPackageDef[] = [
  CREDIT_PACKAGES.starter,
  CREDIT_PACKAGES.popular,
  CREDIT_PACKAGES.pro_value,
  CREDIT_PACKAGES.vip_club,
];

export const PACKAGE_BY_PRICE_ID: Record<string, CreditPackageDef> = Object.fromEntries(
  Object.values(CREDIT_PACKAGES).map((p) => [p.priceId, p]),
);

export const PACKAGE_BY_PLAY_PRODUCT_ID: Record<string, CreditPackageDef> = Object.fromEntries(
  Object.values(CREDIT_PACKAGES).map((p) => [p.playProductId, p]),
);
