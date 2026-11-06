import { CREDIT_PACKAGE_LIST, type CreditPackageKey } from "@/lib/credit-packages";

export type ListenerStatus = "online" | "busy" | "offline";

/** Languages spoken, as slash-separated codes (e.g. "EN/NL"). */
export type ListenerLanguage = string;

export type Listener = {
  id: string;
  displayName: string;
  avatar: string;
  age: number;
  bio: { en: string; nl: string };
  /** Short invitation shown on the card to start a chat. */
  cta: string;
  language: ListenerLanguage;
  topics: { en: string; nl: string }[];
  status: ListenerStatus;
  years: number;
};

export const listeners: Listener[] = [
  {
    id: "p1",
    displayName: "Lotte",
    avatar: "/avatars/partner-1.jpg",
    age: 27,
    bio: { en: "Coffee, long bike rides and honest talks. I'm the friend who actually listens.", nl: "Coffee, long bike rides and honest talks. I'm the friend who actually listens." },
    cta: "Rough day? Tell me about it, I'm all ears.",
    language: "EN/NL",
    topics: [{ en: "Everyday stress", nl: "Everyday stress" }, { en: "Cycling", nl: "Cycling" }, { en: "Honest talks", nl: "Honest talks" }],
    status: "online",
    years: 3,
  },
  {
    id: "p2",
    displayName: "Hanna",
    avatar: "/avatars/partner-2.jpg",
    age: 31,
    bio: { en: "Bookworm and caf\u00e9 regular from Berlin. I love the conversations that start with 'so, the thing is...'", nl: "Bookworm and caf\u00e9 regular from Berlin. I love the conversations that start with 'so, the thing is...'" },
    cta: "Head full tonight? Message me and let's sort it out.",
    language: "EN/DE",
    topics: [{ en: "Books", nl: "Books" }, { en: "Work pressure", nl: "Work pressure" }, { en: "Late-night thoughts", nl: "Late-night thoughts" }],
    status: "online",
    years: 3,
  },
  {
    id: "p3",
    displayName: "Chloe",
    avatar: "/avatars/partner-3.jpg",
    age: 25,
    bio: { en: "Park walks, bad puns and good listening from Manchester. No small talk required.", nl: "Park walks, bad puns and good listening from Manchester. No small talk required." },
    cta: "Say hi, I'd love to hear what's going on.",
    language: "EN",
    topics: [{ en: "Loneliness", nl: "Loneliness" }, { en: "Humour", nl: "Humour" }, { en: "Relationships", nl: "Relationships" }],
    status: "online",
    years: 3,
  },
  {
    id: "p4",
    displayName: "Katerina",
    avatar: "/avatars/partner-4.jpg",
    age: 29,
    bio: { en: "Athens girl who loves sunsets, cooking and deep chats that go on a bit too long.", nl: "Athens girl who loves sunsets, cooking and deep chats that go on a bit too long." },
    cta: "Tell me what's on your mind, I've got time.",
    language: "EN/EL",
    topics: [{ en: "Food & cooking", nl: "Food & cooking" }, { en: "Deep chats", nl: "Deep chats" }, { en: "Travel", nl: "Travel" }],
    status: "online",
    years: 3,
  },
  {
    id: "p5",
    displayName: "Lucía",
    avatar: "/avatars/partner-5.jpg",
    age: 33,
    bio: { en: "Warm, direct and a little cheeky. From Valencia, and I never judge.", nl: "Warm, direct and a little cheeky. From Valencia, and I never judge." },
    cta: "Need to vent? Start typing, I'm here.",
    language: "EN/ES",
    topics: [{ en: "Venting", nl: "Venting" }, { en: "Family", nl: "Family" }, { en: "Breakups", nl: "Breakups" }],
    status: "online",
    years: 3,
  },
  {
    id: "p6",
    displayName: "Beatriz",
    avatar: "/avatars/partner-6.jpg",
    age: 28,
    bio: { en: "Music, city walks and calm conversations in Lisbon.", nl: "Music, city walks and calm conversations in Lisbon." },
    cta: "Message me when the night feels long.",
    language: "EN/PT",
    topics: [{ en: "Music", nl: "Music" }, { en: "Sleepless nights", nl: "Sleepless nights" }, { en: "Calm chats", nl: "Calm chats" }],
    status: "online",
    years: 3,
  },
  {
    id: "p7",
    displayName: "Camille",
    avatar: "/avatars/partner-7.jpg",
    age: 30,
    bio: { en: "Novels, tea and real conversations from Lyon.", nl: "Novels, tea and real conversations from Lyon." },
    cta: "Tell me about your day, the good and the messy.",
    language: "EN/FR",
    topics: [{ en: "Your day", nl: "Your day" }, { en: "Books", nl: "Books" }, { en: "Self-doubt", nl: "Self-doubt" }],
    status: "online",
    years: 3,
  },
  {
    id: "p8",
    displayName: "Giulia",
    avatar: "/avatars/partner-8.jpg",
    age: 26,
    bio: { en: "Always smiling, always curious. Florence born and raised.", nl: "Always smiling, always curious. Florence born and raised." },
    cta: "Bored or down? Send me a message and let's chat.",
    language: "EN/IT",
    topics: [{ en: "Fun distractions", nl: "Fun distractions" }, { en: "Dating", nl: "Dating" }, { en: "Motivation", nl: "Motivation" }],
    status: "online",
    years: 3,
  },
  {
    id: "p9",
    displayName: "Elif",
    avatar: "/avatars/partner-9.jpg",
    age: 32,
    bio: { en: "Road trips and heart-to-hearts from Istanbul.", nl: "Road trips and heart-to-hearts from Istanbul." },
    cta: "Whatever you're carrying, you can share it with me.",
    language: "EN/TR",
    topics: [{ en: "Heart-to-hearts", nl: "Heart-to-hearts" }, { en: "Career", nl: "Career" }, { en: "Stress relief", nl: "Stress relief" }],
    status: "online",
    years: 3,
  },
  {
    id: "p10",
    displayName: "Zofia",
    avatar: "/avatars/partner-10.jpg",
    age: 27,
    bio: { en: "Winter lover from Krak\u00f3w, good listener, zero judgment.", nl: "Winter lover from Krak\u00f3w, good listener, zero judgment." },
    cta: "Say hi and tell me what's going on.",
    language: "EN/PL",
    topics: [{ en: "No judgment", nl: "No judgment" }, { en: "Feeling stuck", nl: "Feeling stuck" }, { en: "Casual chat", nl: "Casual chat" }],
    status: "online",
    years: 3,
  },
];

// Pricing lives in src/lib/credit-packages.ts, which is also what Stripe is
// billed against. These are thin view models derived from that single source.
export type CreditPackage = {
  id: string;
  key: CreditPackageKey;
  credits: number;
  /** Free bonus credits added on top of `credits`. */
  bonus: number;
  priceEur: number;
  popular: boolean;
};

export const creditPackages: CreditPackage[] = CREDIT_PACKAGE_LIST.map((p) => ({
  id: p.key,
  key: p.key,
  credits: p.credits,
  bonus: p.bonus,
  priceEur: p.cents / 100,
  popular: p.popular === true,
}));
