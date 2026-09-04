export type Review = {
  name: string;
  place: string;
  rating: 4 | 5;
  date: string;
  text: string;
  tag: string;
};

/** Rotating community voices shown on the homepage and landing pages. */
export const reviews: Review[] = [
  {
    name: "Mark T.",
    place: "Rotterdam, NL",
    rating: 5,
    date: "2026-08-29",
    tag: "Late-night talk",
    text: "Couldn't sleep, didn't want to wake anyone. Typed for twenty minutes to Marit and actually felt lighter. Nobody knows my name here and somehow that made it easier to be honest.",
  },
  {
    name: "Daniel K.",
    place: "Munich, DE",
    rating: 5,
    date: "2026-08-26",
    tag: "Venting",
    text: "I expected a bot with canned answers. Instead I got someone who asked the one question my friends never do: 'and how did that make you feel?' Ended up talking about my dad for the first time in years.",
  },
  {
    name: "Nikos P.",
    place: "Thessaloniki, GR",
    rating: 4,
    date: "2026-08-24",
    tag: "Loneliness",
    text: "Moved cities for work and knew nobody. Chatting with Yannis in Greek about music and home cooking was the first normal conversation I'd had in weeks. The free messages were enough to see it's real.",
  },
  {
    name: "Jeroen V.",
    place: "Utrecht, NL",
    rating: 5,
    date: "2026-08-21",
    tag: "Stress relief",
    text: "The mood picker is a small thing but it works. I chose 'venting' and got exactly that: no advice, no fixing, just someone reading properly and replying like a person.",
  },
  {
    name: "Tom H.",
    place: "Antwerp, BE",
    rating: 5,
    date: "2026-08-18",
    tag: "Relationship advice",
    text: "Was about to send a message I'd regret. Typed it out here first, got a calm second opinion, deleted it. Ten credits well spent.",
  },
  {
    name: "Stavros L.",
    place: "Athens, GR",
    rating: 4,
    date: "2026-08-15",
    tag: "Everyday chat",
    text: "Sometimes you just want to talk about your day without it turning into a thing. Eleni remembers what you said three messages ago, which is more than I can say for most people.",
  },
  {
    name: "Lukas B.",
    place: "Hamburg, DE",
    rating: 5,
    date: "2026-08-12",
    tag: "Career worries",
    text: "Talked through a job offer with Stefan at 1am. He didn't tell me what to do, he asked what I was afraid of. Took the job.",
  },
  {
    name: "Sam R.",
    place: "Dublin, IE",
    rating: 5,
    date: "2026-08-09",
    tag: "Anonymity",
    text: "What sold me: no phone number, no photo, a bank statement that says nothing. I can be completely open and it never follows me anywhere.",
  },
  {
    name: "Pieter D.",
    place: "Ghent, BE",
    rating: 4,
    date: "2026-08-05",
    tag: "First-timer",
    text: "Skeptical guy here. Used the five free messages expecting nothing. Came back the next evening on my own. That's the review.",
  },
];
