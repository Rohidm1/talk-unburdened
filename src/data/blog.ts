export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  date: string;
  /** Markdown-lite: paragraphs, "## " headings and "- " bullets. */
  body: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "why-talking-helps",
    title: "Why simply talking about it changes how you feel",
    excerpt:
      "Putting a worry into words is not small talk — it is one of the fastest ways to calm a busy mind. Here is what happens inside you when you do.",
    category: "Mental health",
    readMinutes: 5,
    date: "2026-07-14",
    body: `Most worries feel enormous while they stay inside your head. They loop, they grow, and they borrow energy from everything else you try to do. The moment you put them into a sentence, something shifts.

## Naming turns noise into information
Psychologists call it "affect labelling": the act of naming an emotion measurably lowers its intensity. A vague dread becomes "I am scared I will lose this job", and a nameable fear is something you can actually think about.

## A listener slows your thinking down
When you write to another person you automatically order your thoughts: first this happened, then I felt that. That ordering is the work. The reply matters less than the act of being understood.

## Why anonymity helps
Without your name attached, there is nothing to protect. No reputation, no follow-up questions tomorrow, no worried face across the table. People consistently share more honestly when the conversation cannot follow them home.

## Try it in five minutes
- Write one sentence about the thing you keep circling back to.
- Add why it matters to you.
- Notice how you feel after sending it.

You do not need a crisis to deserve a conversation. Most of the relief comes from the first honest paragraph.`,
  },
  {
    slug: "self-reflection-questions",
    title: "Seven self-reflection questions that actually go somewhere",
    excerpt:
      "Journaling prompts often produce polite answers. These seven questions dig one layer deeper, and they work just as well in a chat.",
    category: "Personal growth",
    readMinutes: 6,
    date: "2026-07-02",
    body: `Reflection fails when the questions are too big. "What do I want from life?" invites a shrug. Smaller, sharper questions get honest answers.

## The questions
- What drained me most this week, and was it the task or the person?
- What did I say yes to that I quietly resented?
- When did I feel most like myself in the last month?
- What am I pretending not to know?
- Which worry have I been carrying for over a year without acting on it?
- Who would I tell if there were no consequences?
- What would "a good week" concretely look like seven days from now?

## Make them conversational
Answer them out loud to someone rather than in a notebook. A second person naturally asks "why?" — and the second answer is almost always the true one.

## Keep the bar low
One question per sitting is plenty. Reflection is not a productivity project; it is maintenance for the part of you that has to live with your decisions.`,
  },
  {
    slug: "loneliness-is-common",
    title: "Loneliness is not a character flaw — it's a signal",
    excerpt:
      "Feeling alone in a crowded life is more common than almost anyone admits. Treating it as information instead of shame changes what you do next.",
    category: "Mental health",
    readMinutes: 5,
    date: "2026-06-20",
    body: `Loneliness has a bad reputation. We treat it as evidence that something is wrong with us, when it functions much more like thirst: an uncomfortable signal that a need is unmet.

## Connection is a quantity and a quality
You can be surrounded by colleagues, group chats and family dinners and still feel unseen. What people usually miss is not company but candour — one place where the polished version is not required.

## The spiral
The cruel part is that loneliness makes reaching out harder. You assume you will be a burden, so you send fewer messages, so there is less contact, so the assumption feels confirmed.

## Breaking the loop cheaply
- Start with a low-stakes conversation where rejection costs nothing.
- Say the real thing in the first two sentences instead of building up to it.
- Repeat sooner than feels natural; connection is built by frequency, not intensity.

If the first honest conversation happens with a stranger, that still counts. The skill transfers.`,
  },
  {
    slug: "stress-reset-routine",
    title: "A ten-minute reset for a week that got away from you",
    excerpt:
      "When everything is urgent, the answer is rarely another productivity system. This is a short, evidence-informed reset you can run tonight.",
    category: "Personal growth",
    readMinutes: 4,
    date: "2026-06-05",
    body: `Stress narrows attention. That is useful for a sprint and terrible for a week. The way out is not more effort — it is deliberately widening your view again.

## Minute 1-3: empty the pockets
Write down every open loop, however trivial. Unsent emails, the dentist, the argument. The list is almost always shorter than the feeling.

## Minute 4-6: sort by control
Mark each item: mine to solve, someone else's, or nobody's. Most anxiety concentrates in the last two categories, where effort cannot reach.

## Minute 7-8: pick exactly one
One item, one next physical action, today or tomorrow. Momentum beats completeness.

## Minute 9-10: say it to someone
Tell one person what the week actually felt like. Not the summary you would give a manager — the real version. Naming it closes the loop your body has been holding open.`,
  },
  {
    slug: "talking-to-a-stranger",
    title: "The strange comfort of talking to a stranger",
    excerpt:
      "Research keeps finding the same thing: we underestimate how good conversations with strangers feel — and how much easier honesty becomes.",
    category: "Psychology",
    readMinutes: 5,
    date: "2026-05-22",
    body: `There is a well-documented effect where people expect conversations with strangers to be awkward, then rate them as far more enjoyable than predicted afterwards. We are bad forecasters of our own social experience.

## Why strangers get the honest version
A stranger has no history with you and no stake in the outcome. There is no image to maintain and no consequences next Tuesday. That removes the two biggest brakes on candour.

## It is not a substitute for close ties
Deep relationships do things a one-off conversation cannot. But they also carry expectations, and sometimes what you need is a place where nothing is expected of you at all.

## What makes it work
- Skip the preamble; start with the actual thing.
- Ask for what you want: to vent, to think out loud, or to be challenged.
- Let it end when it ends. Not every conversation has to become a relationship.`,
  },
  {
    slug: "boundaries-without-guilt",
    title: "Setting boundaries without the guilt hangover",
    excerpt:
      "Saying no is the easy part. Surviving the twelve hours afterwards is the skill nobody teaches. Here is how to build it.",
    category: "Personal growth",
    readMinutes: 6,
    date: "2026-05-08",
    body: `Boundaries fail less often at the moment of the "no" and more often in the aftermath, when guilt arrives and quietly renegotiates the deal.

## Guilt is not proof you did wrong
Guilt is a habit signal. If you have spent years being reliably available, the first refusals will feel wrong regardless of whether they were right. Expect the feeling; do not treat it as evidence.

## Script the sentence in advance
"I can't take that on this month" needs no justification attached. Explanations invite negotiation. Warmth plus brevity is the combination that holds.

## Plan the twelve hours after
- Decide beforehand that you will not follow up with an apology message.
- Tell one person what you did, so it becomes a story about integrity rather than a secret.
- Write the reason you said no while it still feels obvious; reread it when guilt rewrites history.

Boundaries are not walls. They are the reason you still have something left to give the people who matter.`,
  },
];

export function getPost(slug: string) {
  return blogPosts.find((p) => p.slug === slug) ?? null;
}
