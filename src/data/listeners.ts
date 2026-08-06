export type ListenerStatus = "online" | "busy" | "offline";

/** A listener speaks exactly one language on the platform: NL or EN. */
export type ListenerLanguage = "NL" | "EN";

export type Listener = {
  id: string;
  displayName: string;
  avatar: string;
  age: number;
  bio: { en: string; nl: string };
  /** Single language — cards never show two badges. */
  language: ListenerLanguage;
  topics: { en: string; nl: string }[];
  status: ListenerStatus;
  years: number;
};

export const listeners: Listener[] = [
  {
    id: "l1",
    displayName: "Amara",
    avatar: "/avatars/profile-1.jpg",
    age: 24,
    bio: {
      nl: "Bij mij kun je gerust je hart luchten zonder dat iemand oordeelt. Ik ben er om in alle rust naar je te luisteren.",
      en: "Bij mij kun je gerust je hart luchten zonder dat iemand oordeelt. Ik ben er om in alle rust naar je te luisteren.",
    },
    language: "NL",
    topics: [
      { en: "Hart luchten", nl: "Hart luchten" },
      { en: "Zonder oordeel", nl: "Zonder oordeel" },
    ],
    status: "online",
    years: 3,
  },
  {
    id: "l2",
    displayName: "Grace",
    avatar: "/avatars/profile-2.jpg",
    age: 48,
    bio: {
      en: "Here to offer a calm and listening ear whenever life feels overwhelming. You don't have to carry it all alone.",
      nl: "Here to offer a calm and listening ear whenever life feels overwhelming. You don't have to carry it all alone.",
    },
    language: "EN",
    topics: [
      { en: "Feeling overwhelmed", nl: "Feeling overwhelmed" },
      { en: "Quiet support", nl: "Quiet support" },
    ],
    status: "online",
    years: 12,
  },
  {
    id: "l3",
    displayName: "Sanne",
    avatar: "/avatars/profile-3.jpg",
    age: 42,
    bio: {
      nl: "Soms helpt het gewoon om alles even hardop uit te spreken. Ik luister met volledige aandacht en rust naar jouw verhaal.",
      en: "Soms helpt het gewoon om alles even hardop uit te spreken. Ik luister met volledige aandacht en rust naar jouw verhaal.",
    },
    language: "NL",
    topics: [
      { en: "Hardop uitspreken", nl: "Hardop uitspreken" },
      { en: "Volle aandacht", nl: "Volle aandacht" },
    ],
    status: "online",
    years: 8,
  },
  {
    id: "l4",
    displayName: "Elena",
    avatar: "/avatars/profile-4.jpg",
    age: 26,
    bio: {
      en: "A safe and peaceful space for a quick vent or sharing whatever is on your mind today.",
      nl: "A safe and peaceful space for a quick vent or sharing whatever is on your mind today.",
    },
    language: "EN",
    topics: [
      { en: "Quick vent", nl: "Quick vent" },
      { en: "Safe space", nl: "Safe space" },
    ],
    status: "busy",
    years: 4,
  },
  {
    id: "l5",
    displayName: "Priya",
    avatar: "/avatars/profile-5.jpg",
    age: 52,
    bio: {
      nl: "Rust en oprechte aandacht voor jouw verhaal, op jouw eigen tempo. Samen nemen we even een moment van stilte en steun.",
      en: "Rust en oprechte aandacht voor jouw verhaal, op jouw eigen tempo. Samen nemen we even een moment van stilte en steun.",
    },
    language: "NL",
    topics: [
      { en: "Jouw tempo", nl: "Jouw tempo" },
      { en: "Rust en steun", nl: "Rust en steun" },
    ],
    status: "online",
    years: 15,
  },
  {
    id: "l6",
    displayName: "Maya",
    avatar: "/avatars/profile-6.jpg",
    age: 34,
    bio: {
      en: "Whenever you need a comforting conversation or just someone to listen quietly, I am here for you.",
      nl: "Whenever you need a comforting conversation or just someone to listen quietly, I am here for you.",
    },
    language: "EN",
    topics: [
      { en: "Comforting talk", nl: "Comforting talk" },
      { en: "Quiet listening", nl: "Quiet listening" },
    ],
    status: "online",
    years: 6,
  },
  {
    id: "l7",
    displayName: "Yuki",
    avatar: "/avatars/profile-7.jpg",
    age: 28,
    bio: {
      nl: "Voor als je even stil wilt staan bij wat je voelt en behoefte hebt aan een rustige stem aan de andere kant van de lijn.",
      en: "Voor als je even stil wilt staan bij wat je voelt en behoefte hebt aan een rustige stem aan de andere kant van de lijn.",
    },
    language: "NL",
    topics: [
      { en: "Rustige stem", nl: "Rustige stem" },
      { en: "Even stilstaan", nl: "Even stilstaan" },
    ],
    status: "offline",
    years: 5,
  },
];

// Pricing lives in src/lib/credit-packages.ts, which is also what Stripe is
// billed against. These are thin view models derived from that single source.
export type CreditPackage = {
  id: string;
  key: CreditPackageKey;
  minutes: number;
  priceEur: number;
  popular: boolean;
};

export const creditPackages: CreditPackage[] = CREDIT_PACKAGE_LIST.map((p) => ({
  id: p.key,
  key: p.key,
  minutes: p.minutes,
  priceEur: p.cents / 100,
  popular: p.popular === true,
}));