/** Support Wings: anonymous supporter levels earned through kind activity. */
export const WING_LEVELS = [
  { min: 0, name: "Fledgling", emoji: "🪶" },
  { min: 10, name: "Listener", emoji: "🕊️" },
  { min: 30, name: "Supporter", emoji: "🪽" },
  { min: 75, name: "Guardian", emoji: "🌟" },
  { min: 150, name: "Lighthouse", emoji: "🗼" },
] as const;

export function wingLevel(points: number) {
  let idx = 0;
  WING_LEVELS.forEach((l, i) => {
    if (points >= l.min) idx = i;
  });
  const current = WING_LEVELS[idx]!;
  const next = WING_LEVELS[idx + 1] ?? null;
  const progress = next ? (points - current.min) / (next.min - current.min) : 1;
  return { ...current, next, progress: Math.max(0, Math.min(1, progress)) };
}

export const FORTUNES = [
  "You don't have to have it all figured out to move forward.",
  "Small steps still count. Today, one is enough.",
  "The fact that you keep going says a lot about you.",
  "You are allowed to rest without earning it.",
  "Someone out there is glad you exist — even if they haven't said it.",
  "Feelings are visitors. Let them come, let them go.",
  "You've survived every hard day so far. That's a perfect record.",
  "Talking about it is not weakness. It's maintenance.",
  "Be as kind to yourself as you would be to a friend.",
  "Progress, not perfection.",
  "It's okay to outgrow what once felt like home.",
  "Breathe in for four. Out for six. You're here.",
  "One honest conversation can change a whole week.",
  "Your pace is the right pace.",
  "Not every day is good, but there is something good in every day.",
  "You are more than the worst thing that happened to you.",
];

export function fortuneText(index: number) {
  return FORTUNES[Math.abs(index) % FORTUNES.length]!;
}
