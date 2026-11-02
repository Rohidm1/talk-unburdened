export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  date: string;
  /** Last meaningful content update (YYYY-MM-DD). */
  updated?: string;
  /** Search-result title; falls back to `${title} | Anontalk`. */
  seoTitle?: string;
  /** Search-result description; falls back to the excerpt. */
  seoDescription?: string;
  /**
   * Markdown-lite: paragraphs, "## " headings, "- " bullets, and a line
   * containing only "[[chat]]" for an inline chat button.
   */
  body: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "no-one-to-talk-to",
    title: "I have no one to talk to: what to do tonight (and after)",
    seoTitle: "I Have No One to Talk To – What to Do Tonight | Anontalk",
    seoDescription:
      "Feel like you have no one to talk to? Simple steps for tonight, why it happens, and where to talk to a real person anonymously. Free to start.",
    excerpt:
      "Feel like you have no one to talk to? You are far from the only one. Here is what helps tonight, why it happens, and small steps for the weeks after.",
    category: "Loneliness",
    readMinutes: 7,
    date: "2026-09-02",
    updated: "2026-11-02",
    body: `If you typed "I have no one to talk to" into a search bar, you already did the hardest part: you admitted it. Lots of people feel this way and never say it, not even to a search engine. This page gives you a short answer for tonight and a few small steps for after.

## The short answer
When you have no one to talk to, you do not need a best friend tonight. You need one person who will read what you write and reply like a human. Here are a few options:
- An anonymous chat with a real person, so you can say the unedited version.
- A message to someone you have not spoken to in a while, even just "thinking of you, how have you been?"
- Writing it down first, so the thought is out of your head before you talk to anyone.

If you are in danger or thinking about hurting yourself, call 112 (in Europe) or your local emergency number right now. A chat site is not the right place for that moment.

## Who can I talk to when I have no one?
More people than it feels like at 2am:
- A stranger online who chose to be available. On Anontalk, chat partners are there to listen. They are not there to judge you or try to fix you.
- An old friend or classmate. People are usually glad to hear from someone again, even after years.
- A sibling, cousin or other relative you used to get on with.
- People who share a hobby, like a gym, a running club, a game server or a volunteering group. You talk about the activity first, and real conversations come later.
- A free helpline in your country if things feel heavy and you would rather speak to someone by phone.

## Why do I feel like I have no one to talk to?
It is rarely because something is wrong with you. Common reasons:
- Life moved on. A new city, a new job, a breakup or friends having kids can quietly shrink your circle.
- Your friends are there for fun, not for "real" talk, and switching modes feels awkward.
- You are usually the one who listens, so nobody thinks to ask how you are.
- Men in particular often grow up learning to keep things to themselves, so even close friends never hear the real stuff.

None of these mean you are alone for good. Usually you are just missing one place where honest talk is normal.

## What to do tonight
Split the problem in two. One part is long-term: friendships and community. The other part is tonight: one thought that needs to leave your head before you can sleep. Trying to fix the long-term part at midnight is how you end up scrolling until three. Fix tonight first.
- Pick one sentence that sums up what is on your mind.
- Say that sentence to someone first. Skip the "hey, how are you" and start with the thing: "I've been feeling invisible for months and I don't know who to tell."
- Let them reply. You do not have to solve anything. You just have to stop carrying it alone.

[[chat]]

## Is it okay to talk to a stranger about personal things?
Yes, and it is often easier. A stranger has no history with you, will not bring it up at work tomorrow, and does not need you to stay "the strong one". Keep it safe: do not share your full name, address, phone number or other personal details. On Anontalk, phone numbers, emails and addresses are blurred automatically in many chats.

## Small steps for the weeks after
Once tonight is handled, the bigger question gets easier:
- Message one person a week, even with something small.
- Say yes to one plan you would usually skip.
- Join one regular thing, like a class, a team or a club, where you see the same faces every week.
- Keep practising honest sentences. People who say real things to strangers get noticeably better at saying them to people they know. Tonight's conversation is the rehearsal.

## How Anontalk works
Anontalk is an anonymous text chat with friendly chat partners. You sign up with just an email and a nickname, with no real name and no photo. Your first five messages are free, and after that you can buy message credits if you want to keep chatting. You choose who to chat with, and you can leave whenever you like.`,
  },
  {
    slug: "omegle-alternative-that-is-not-a-lottery",
    title: "Looking for an Omegle alternative? Here's what actually matters",
    excerpt:
      "Random video roulette is gone and most replacements copy its worst parts. If what you wanted was a real conversation with a stranger, these are the things to look for.",
    category: "Talk to strangers",
    readMinutes: 6,
    date: "2026-08-30",
    body: `Omegle shut down because random pairing at scale is impossible to keep safe. The sites that rushed in to replace it mostly kept the lottery and lost the part people actually came for: an unexpected, honest conversation with someone who had no reason to judge you.

## What people were really looking for
Ask former users what they miss and it is rarely the webcam. It is the feeling of being able to say anything to someone who does not know you, and having them actually respond. That need did not go away.

## The checklist for a decent alternative
- Text first. Typing gives you time to say what you mean, and nobody has to see your face at 1am.
- A real person on the other side who wants to be there, not whoever the algorithm threw at you.
- Anonymity that holds up: no phone number, no photo, no profile that follows you around.
- A way to leave the moment it stops feeling right, with no consequences.
- Clear costs. Free to try, and no surprise subscriptions.

## Why matched beats random
A random stranger owes you nothing and often acts like it. A chat partner who chose to be available tonight, who you picked because their vibe matched yours, is a different experience entirely. You lose the slot-machine thrill; you gain the conversation you came for.

## Try it the right way
Pick the mood you are in, not the person you think you should be. Start with the honest sentence. Give it five messages before you decide. That is how long it takes to tell the difference between a lottery and a conversation.`,
  },
  {
    slug: "stop-overthinking-at-night",
    title: "Why your brain gets louder at midnight (and how to turn it down)",
    excerpt:
      "Overthinking at night is not a willpower problem. It is what happens when the day's distractions switch off. Three things that actually quiet it.",
    category: "Stress",
    readMinutes: 5,
    date: "2026-08-27",
    body: `During the day your worries compete with emails, traffic, other people. At night the competition leaves and the worries get the whole stage. That is why the same thought that felt manageable at lunch feels catastrophic at midnight.

## It is a volume problem, not a truth problem
Nothing about your situation changed between 2pm and 2am. Only the volume did. Reminding yourself of that does not fix it, but it stops you from treating the midnight version as the accurate one.

## Three things that reliably work
- Externalise it. A worry inside your head loops; a worry written down or said to someone becomes a sentence with a beginning and an end. The act of forming the sentence is what breaks the loop.
- Give it a time slot. Tell yourself "I will think about this properly at 10am tomorrow". It sounds silly. It works, because the brain mostly wants reassurance that the problem will not be forgotten.
- Talk to someone who is awake. Not to solve anything, just to put the thought somewhere outside you for twenty minutes. Anonymous chats exist for exactly this hour.

## What does not work
Reading about the problem. Researching solutions. Drafting the message you will send tomorrow. All of these feel productive and all of them feed the loop.

## The five-message test
Type the thing that is looping to someone who does not know you. Watch what happens to its size once it is on the screen instead of in your head. Most people are surprised.`,
  },
  {
    slug: "how-to-start-a-conversation-about-something-hard",
    title: "How to start a conversation when you don't know how to start",
    excerpt:
      "The blank message box is the real obstacle. Six opening lines that get the hard thing out in the first ten seconds, before you can talk yourself out of it.",
    category: "Personal growth",
    readMinutes: 4,
    date: "2026-08-23",
    body: `Most conversations that never happen fail at the first line. Not because the person was unwilling, but because there was no obvious way in. So here are the ways in.

## Six openers that work
- "I don't really know how to say this, so I'm just going to say it:"
- "Can I think out loud for a minute? I don't need advice."
- "Something's been bothering me for weeks and I haven't told anyone."
- "This is going to sound small but it's not small to me."
- "I'm not okay and I'm tired of pretending I am."
- "I just need someone to read this. That's it."

## Why they work
Each one names the awkwardness instead of pretending it is not there. Each one tells the other person what you need, so they do not have to guess. And each one takes less than ten seconds to type, which is shorter than the time it takes for doubt to kick in.

## Use anonymity as training wheels
If saying these to someone you know feels impossible, say them to someone you do not know first. An anonymous chat is a low-stakes rehearsal: same words, none of the consequences. Once you have heard yourself say the sentence out loud, the second time is easier.

## Then stop
After the opener, resist the urge to explain, soften or apologise. Let the other person respond. The hard part is done.`,
  },
  {
    slug: "peer-support-vs-professional-help",
    title: "A peer conversation is not treatment — here's what it is good for",
    excerpt:
      "Talking to a warm stranger will not replace professional care, and it should not try to. But there is a lot it does better. An honest map of where each one fits.",
    category: "Mental health",
    readMinutes: 6,
    date: "2026-08-19",
    body: `We get asked this a lot, so let's be direct. The people you chat with on Anontalk are not professionals and they do not pretend to be. That is a limitation and, in some situations, an advantage. Knowing which is which matters.

## When you need a professional
If you are in danger, if you cannot function day to day, if something has been getting worse for months: that is a job for trained help, and no amount of kind conversation substitutes for it. Please reach out to a local service or emergency line. We mean that.

## What a peer does well
- Immediacy. Tonight, in two minutes, not in six weeks.
- Ordinary language. No intake forms, no frameworks, just someone reading and responding.
- Equality. Nobody is assessing you. You can complain about your boss without it becoming a symptom.
- Practice. Saying things to a peer makes it easier to say them to a professional later.

## The honest overlap
A huge share of what weighs on people is not clinical at all. It is a bad week, a text that was never answered, a decision that will not sit still. Those things get lighter when they are spoken. That is what peers are for.

## Use both without guilt
Plenty of people talk to a professional on Tuesdays and to a stranger at midnight on Fridays. Those are not competing choices. They are different tools for different hours.`,
  },
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
