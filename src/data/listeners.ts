import { CREDIT_PACKAGE_LIST, type CreditPackageKey } from "@/lib/credit-packages";

export type ListenerStatus = "online" | "busy" | "offline";

/** Primary language badge shown on the card. */
export type ListenerLanguage = "NL" | "EN" | "EN/EL/NL/DE";

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
      nl: "You can get things off your chest here without anyone judging you. I'm here to read every word calmly.",
      en: "You can get things off your chest here without anyone judging you. I'm here to read every word calmly.",
    },
    language: "EN",
    topics: [
      { en: "Getting it off your chest", nl: "Getting it off your chest" },
      { en: "No judgment", nl: "No judgment" },
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
      en: "Here to chat calmly whenever life feels overwhelming. You don't have to carry it all alone.",
      nl: "Here to chat calmly whenever life feels overwhelming. You don't have to carry it all alone.",
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
      nl: "Sometimes it just helps to put everything into words. I give your story my full, unhurried attention.",
      en: "Sometimes it just helps to put everything into words. I give your story my full, unhurried attention.",
    },
    language: "EN",
    topics: [
      { en: "Putting it into words", nl: "Putting it into words" },
      { en: "Full attention", nl: "Full attention" },
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
    status: "online",
    years: 4,
  },
  {
    id: "l5",
    displayName: "Priya",
    avatar: "/avatars/profile-5.jpg",
    age: 52,
    bio: {
      nl: "Calm, genuine attention for your story, at your own pace. A quiet moment of support, whenever you need it.",
      en: "Calm, genuine attention for your story, at your own pace. A quiet moment of support, whenever you need it.",
    },
    language: "EN",
    topics: [
      { en: "Your own pace", nl: "Your own pace" },
      { en: "Calm support", nl: "Calm support" },
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
      { en: "Quiet chats", nl: "Quiet chats" },
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
      nl: "For when you want to pause and sit with what you feel, with a steady presence on the other side of the chat.",
      en: "For when you want to pause and sit with what you feel, with a steady presence on the other side of the chat.",
    },
    language: "EN",
    topics: [
      { en: "Steady presence", nl: "Steady presence" },
      { en: "Taking a pause", nl: "Taking a pause" },
    ],
    status: "online",
    years: 5,
  },
];

// Pricing lives in src/lib/credit-packages.ts, which is also what Stripe is
// billed against. These are thin view models derived from that single source.
export type CreditPackage = {
  id: string;
  key: CreditPackageKey;
  credits: number;
  priceEur: number;
  popular: boolean;
};

export const creditPackages: CreditPackage[] = CREDIT_PACKAGE_LIST.map((p) => ({
  id: p.key,
  key: p.key,
  credits: p.credits,
  priceEur: p.cents / 100,
  popular: p.popular === true,
}));
