import { CREDIT_PACKAGE_LIST, type CreditPackageKey } from "@/lib/credit-packages";

export type ListenerStatus = "online" | "busy" | "offline";

/** Primary language badge shown on the card. */
export type ListenerLanguage = "NL" | "EN" | "EN/EL/NL/DE" | "EN/NL" | "EN/DE" | "EN/EL";

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
  {
    id: "l8",
    displayName: "Eleni",
    avatar: "/avatars/profile-8.jpg",
    age: 31,
    bio: {
      en: "Hi everyone, I'm Eleni. I'm a very empathetic person and a passionate foodie. I love helping people clear their minds. If you need a supportive friend, a virtual shoulder to cry on, or just a fun distraction, I'm your girl.",
      nl: "Hi everyone, I'm Eleni. I'm a very empathetic person and a passionate foodie. I love helping people clear their minds. If you need a supportive friend, a virtual shoulder to cry on, or just a fun distraction, I'm your girl.",
    },
    language: "EN/EL",
    topics: [
      { en: "Emotional support", nl: "Emotional support" },
      { en: "Food & cooking", nl: "Food & cooking" },
      { en: "Venting about work", nl: "Venting about work" },
      { en: "Fun distractions", nl: "Fun distractions" },
    ],
    status: "online",
    years: 7,
  },
  {
    id: "l9",
    displayName: "Marit",
    avatar: "/avatars/profile-9.jpg",
    age: 27,
    bio: {
      en: "I speak English, Greek, Dutch and German, so switch whenever you like. Just a calm chat about whatever is weighing on you today.",
      nl: "I speak English, Greek, Dutch and German, so switch whenever you like. Just a calm chat about whatever is weighing on you today.",
    },
    language: "EN/EL/NL/DE",
    topics: [
      { en: "English, Greek, Dutch, German", nl: "English, Greek, Dutch, German" },
      { en: "Everyday stress", nl: "Everyday stress" },
    ],
    status: "online",
    years: 5,
  },
  {
    id: "l10",
    displayName: "Daniela",
    avatar: "/avatars/profile-10.jpg",
    age: 36,
    bio: {
      en: "Hey there! I'm Daniela. I love deep conversations about life, mindset, and personal growth. Whether you had a stressful day and just need to vent, or want to share your biggest dreams, I'm here to listen without judgment. Let's talk!",
      nl: "Hey there! I'm Daniela. I love deep conversations about life, mindset, and personal growth. Whether you had a stressful day and just need to vent, or want to share your biggest dreams, I'm here to listen without judgment. Let's talk!",
    },
    language: "EN/NL",
    topics: [
      { en: "Your day", nl: "Your day" },
      { en: "Relationship advice", nl: "Relationship advice" },
      { en: "Stress relief", nl: "Stress relief" },
      { en: "Future goals", nl: "Future goals" },
    ],
    status: "online",
    years: 11,
  },
  {
    id: "l11",
    displayName: "Stefan",
    avatar: "/avatars/profile-11.jpg",
    age: 33,
    bio: {
      en: "Hi, I'm Stefan. I'm a tech enthusiast, love sports, and enjoy discussing everything from daily struggles to deep, late-night thoughts. I'm an open book and a great listener. No topic is off-limits with me.",
      nl: "Hi, I'm Stefan. I'm a tech enthusiast, love sports, and enjoy discussing everything from daily struggles to deep, late-night thoughts. I'm an open book and a great listener. No topic is off-limits with me.",
    },
    language: "EN/DE",
    topics: [
      { en: "Sports", nl: "Sports" },
      { en: "Career struggles", nl: "Career struggles" },
      { en: "Casual venting", nl: "Casual venting" },
      { en: "Late-night thoughts", nl: "Late-night thoughts" },
    ],
    status: "online",
    years: 6,
  },
  {
    id: "l12",
    displayName: "Yannis",
    avatar: "/avatars/profile-12.jpg",
    age: 29,
    bio: {
      en: "Hello! Yannis here. I'm a creative soul who loves music, travel, and good vibes. If you're feeling lonely, bored, or just want a genuine conversation with someone who actually listens, send me a message. Let's connect!",
      nl: "Hello! Yannis here. I'm a creative soul who loves music, travel, and good vibes. If you're feeling lonely, bored, or just want a genuine conversation with someone who actually listens, send me a message. Let's connect!",
    },
    language: "EN/EL",
    topics: [
      { en: "Music", nl: "Music" },
      { en: "Loneliness", nl: "Loneliness" },
      { en: "Travel stories", nl: "Travel stories" },
      { en: "Friendly casual chat", nl: "Friendly casual chat" },
    ],
    status: "online",
    years: 4,
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
