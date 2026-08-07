export type CreditPackageKey = "starter" | "popular" | "pro_value" | "vip_club";

/** Chat credit bundles: each customer message consumes one credit. */
export const RATE_CENTS_PER_MESSAGE = 0;
export const RATE_PER_MESSAGE = 0;

/** How many chats one agent may run at the same time. */
export const MAX_CHATS_PER_AGENT = 2;

/** Free credits granted at signup (3 messages). */
export const FREE_TRIAL_MESSAGES = 3;
/** Warn the customer when this little credit is left. */
export const LOW_BALANCE_WARNING_CREDITS = 2;

export type CreditPackageDef = {
  key: CreditPackageKey;
  priceId: string;
  credits: number;
  cents: number;
  popular?: boolean;
};

export const CREDIT_PACKAGES: Record<CreditPackageKey, CreditPackageDef> = {
  starter: {
    key: "starter",
    priceId: "chat_starter_eur",
    credits: 30,
    cents: 999,
  },
  popular: {
    key: "popular",
    priceId: "chat_popular_eur",
    credits: 85,
    cents: 2499,
    popular: true,
  },
  pro_value: {
    key: "pro_value",
    priceId: "chat_pro_value_eur",
    credits: 180,
    cents: 4999,
  },
  vip_club: {
    key: "vip_club",
    priceId: "chat_vip_club_eur",
    credits: 400,
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
