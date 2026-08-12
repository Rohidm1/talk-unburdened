export const ICEBREAKERS = [
  "What's one thing that made today slightly better than yesterday?",
  "If you could delete one worry from your head right now, which would it be?",
  "What's something you're proud of that nobody has noticed?",
  "When was the last time you felt genuinely rested?",
  "What's the song you play when everything feels heavy?",
  "If tonight went perfectly, what would happen?",
  "What's a small thing that always calms you down?",
  "Who do you wish would just ask you how you're doing?",
  "What's the story behind your alias?",
  "What would you do with a completely free Saturday?",
  "What's something you've never said out loud?",
  "What does a good day look like for you lately?",
  "What's the last thing that made you laugh out loud?",
  "If your week was a weather forecast, what would it be?",
  "What are you carrying right now that feels too heavy to hold alone?",
];

export function rollIcebreaker(previous?: string) {
  let pick = previous;
  while (!pick || pick === previous) {
    pick = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)]!;
  }
  return pick;
}