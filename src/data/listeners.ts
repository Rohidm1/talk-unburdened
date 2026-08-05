import listener1 from "@/assets/listener-1.jpg";
import listener2 from "@/assets/listener-2.jpg";
import listener3 from "@/assets/listener-3.jpg";
import listener4 from "@/assets/listener-4.jpg";

export type ListenerStatus = "online" | "busy" | "offline";

export type Listener = {
  id: string;
  displayName: string;
  avatar: string;
  bio: { en: string; nl: string };
  languages: string[];
  topics: { en: string; nl: string }[];
  status: ListenerStatus;
  years: number;
};

export const listeners: Listener[] = [
  {
    id: "l1",
    displayName: "Noor",
    avatar: listener1,
    bio: {
      en: "Calm, direct and hard to shock. Good with work pressure and the stuff you never say out loud.",
      nl: "Rustig, direct en niet snel verbaasd. Goed met werkdruk en de dingen die je nooit hardop zegt.",
    },
    languages: ["NL", "EN"],
    topics: [
      { en: "Work stress", nl: "Werkstress" },
      { en: "Burnout signals", nl: "Oververmoeid" },
      { en: "Unwinding", nl: "Ontspannen" },
    ],
    status: "online",
    years: 6,
  },
  {
    id: "l2",
    displayName: "Elise",
    avatar: listener2,
    bio: {
      en: "Warm and easy-going. Likes long talks about relationships, family and the messy middle.",
      nl: "Warm en laagdrempelig. Houdt van lange gesprekken over relaties, familie en alles daartussenin.",
    },
    languages: ["NL", "EN"],
    topics: [
      { en: "Relationships", nl: "Relaties" },
      { en: "Fatherhood", nl: "Vaderschap" },
      { en: "Loneliness", nl: "Eenzaamheid" },
    ],
    status: "busy",
    years: 4,
  },
  {
    id: "l3",
    displayName: "Maja",
    avatar: listener3,
    bio: {
      en: "Straight talker with a dry sense of humour. Great for venting after a rough week.",
      nl: "Recht voor z'n raap met droge humor. Ideaal om even flink te ventileren.",
    },
    languages: ["EN"],
    topics: [
      { en: "Venting", nl: "Even ventileren" },
      { en: "Money worries", nl: "Geldzorgen" },
      { en: "Career moves", nl: "Carrièrekeuzes" },
    ],
    status: "online",
    years: 8,
  },
  {
    id: "l4",
    displayName: "Fenna",
    avatar: listener4,
    bio: {
      en: "Thoughtful listener who lets silences breathe. Nights and early mornings are her thing.",
      nl: "Bedachtzame luisteraar die stiltes laat bestaan. Nachten en vroege ochtenden zijn haar ding.",
    },
    languages: ["NL", "EN"],
    topics: [
      { en: "Late night talks", nl: "Nachtgesprekken" },
      { en: "Divorce", nl: "Scheiding" },
      { en: "Self doubt", nl: "Twijfel" },
    ],
    status: "offline",
    years: 3,
  },
];

export const RATE_PER_MINUTE = 1.3;

export type CreditPackage = {
  id: string;
  key: "starter" | "deep" | "value";
  minutes: number;
  priceEur: number;
  priceUsd: number;
  popular?: boolean;
};

export const creditPackages: CreditPackage[] = [
  { id: "p1", key: "starter", minutes: 15, priceEur: 18, priceUsd: 19 },
  { id: "p2", key: "deep", minutes: 45, priceEur: 49, priceUsd: 52, popular: true },
  { id: "p3", key: "value", minutes: 90, priceEur: 89, priceUsd: 95 },
];