export type Article = {
  slug: string;
  title: string;
  teaser: string;
  minutes: number;
  body: string[];
};

export const articles: Article[] = [
  {
    slug: "power-of-anonymous-venting",
    title: "The Power of Anonymous Venting: Why Unfiltered Sharing Heals",
    teaser: "Speaking without fear of judgment lowers stress and helps you name what you feel.",
    minutes: 3,
    body: [
      "Most of us edit ourselves before we speak. We soften the ugly parts, skip the embarrassing details, and finish with 'but it's fine'. That editing costs energy, and it keeps the real feeling locked in place.",
      "Anonymity removes the editor. When the person listening does not know your name, your workplace or your family, there is no social cost to being honest. Research on expressive disclosure consistently shows that putting a feeling into words reduces its physical intensity: heart rate settles, stress hormones like cortisol drop, and the emotion becomes something you can look at instead of something you are drowning in.",
      "There is a second effect, too. Naming a feeling forces precision. 'I'm stressed' becomes 'I'm scared I'll be found out at work and I haven't slept properly in nine days'. That precision is the beginning of doing something about it.",
      "Try this: type the sentence you would never say to someone who knows you. Send it. Notice what happens in your body in the thirty seconds afterwards. Most people describe the same thing - a small unclenching.",
    ],
  },
  {
    slug: "breaking-the-loneliness-cycle",
    title: "Breaking the Loneliness Cycle: Finding Connection in a Digital World",
    teaser: "Micro-connections with strangers interrupt chronic loneliness faster than you think.",
    minutes: 3,
    body: [
      "Loneliness is self-reinforcing. The lonelier you feel, the more your brain scans for rejection, and the more you withdraw - which makes you lonelier. Breaking that loop rarely starts with a big life change. It starts with one interaction that goes well.",
      "Micro-connections are brief, low-stakes exchanges: a real conversation with someone you will probably never speak to again. They are powerful precisely because nothing is at risk. There is no relationship to maintain, no history to manage, no expectation to meet.",
      "What matters is not the length of the conversation but the quality of attention inside it. Ten minutes of being genuinely heard resets your baseline more than an hour of scrolling through other people's highlight reels.",
      "If a whole social life feels impossible right now, aim smaller: one honest exchange today. The loop only needs one interruption to start weakening.",
    ],
  },
  {
    slug: "active-listening-boosts-wellbeing",
    title: "Active Listening: How Helping Others Boosts Your Own Mental Well-being",
    teaser: "Empathy is not a drain. Done well, listening reliably lifts the listener too.",
    minutes: 3,
    body: [
      "People assume listening to someone's problems is a cost you absorb. In practice, peers who listen regularly report higher life satisfaction, more meaning and lower depressive symptoms than those who only receive support.",
      "The mechanism is simple: being useful to another person restores a sense of agency. When your own situation feels stuck, helping someone move an inch reminds you that movement is possible.",
      "Active listening has a shape. Reflect back what you heard in your own words. Ask one question more than feels natural. Resist the urge to fix, compare, or hand over advice in the first two minutes. 'That sounds exhausting - how long has it been like this?' does more work than any solution.",
      "The boundary matters as much as the empathy. You are a peer, not a rescuer. You listen well, and then you put it down.",
    ],
  },
  {
    slug: "digital-sanctuary",
    title: "Digital Sanctuary: Creating Safe Spaces for Mental Health Conversations",
    teaser: "Safety online is built from moderation, boundaries and ordinary kindness.",
    minutes: 3,
    body: [
      "A safe space is not a place where nothing difficult is said. It is a place where difficult things can be said without being used against you.",
      "Three ingredients make that possible. Moderation, so bad-faith behaviour is removed quickly rather than debated endlessly. Clear boundaries, so everyone knows what the space is for and what it is not for. And a culture of kindness that is modelled, not just posted in the rules.",
      "As a participant you shape the space more than you think. Answering a raw message with warmth sets a norm. Ignoring provocation starves it. Reporting harm protects people you will never meet.",
      "Protect yourself too: share feelings freely, share identifying details never. A sanctuary works because of what stays outside it.",
    ],
  },
  {
    slug: "anxiety-and-isolation",
    title: "Anxiety and Isolation: Moving from Silent Suffering to Shared Stories",
    teaser: "Reading someone else's version of your struggle shrinks the feeling of being alone.",
    minutes: 3,
    body: [
      "Anxiety tells a private story: that you are uniquely broken, uniquely behind, uniquely unable to cope with things everyone else handles easily. Isolation is what keeps that story unchallenged.",
      "The moment you read a stranger describing your exact 3 a.m. thought pattern, something shifts. The symptom stops being evidence of a personal defect and becomes a recognisable, common human experience with a name.",
      "That is de-stigmatisation in its most practical form. It does not cure anxiety, but it removes the shame layered on top of it - and shame is often the heavier of the two.",
      "If you are not ready to speak, read. If you are ready to speak, say the version you would normally hide. Someone reading it will feel less alone tonight.",
    ],
  },
  {
    slug: "science-of-empathy",
    title: "The Science of Empathy: Why Stranger-to-Stranger Validation Works",
    teaser: "Validation from an unbiased peer lands differently - and builds resilience.",
    minutes: 3,
    body: [
      "When a close friend reassures you, part of your brain discounts it: they have to say that. A stranger has no such obligation, which is why their validation often lands harder.",
      "Social reward research shows that being understood activates the same reward circuitry as other basic rewards, with dopamine involved in the warm, settled feeling that follows. Feeling accurately understood also reduces activity in threat-related regions - the body reads connection as safety.",
      "Repeated experiences of being understood build emotional resilience. Each one is evidence against the belief that your inner world is too much for other people.",
      "Validation is not agreement. 'That makes sense given what you've been carrying' is validation. It costs nothing and it changes the temperature of a conversation instantly.",
    ],
  },
  {
    slug: "emotional-detox",
    title: "Emotional Detox: Using Chat Platforms to Unburden Your Daily Stress",
    teaser: "A ten-minute end-of-day offload stops stress from following you into tomorrow.",
    minutes: 3,
    body: [
      "Burnout is rarely one catastrophic day. It is hundreds of small, unprocessed frustrations stacked on top of each other because there was never a moment to put them down.",
      "An emotional detox is a deliberate short session - ten to fifteen minutes - where the only goal is to offload. Not to solve, not to plan, not to be reasonable. Dump the day.",
      "A simple structure works well: what happened, how it felt, and what you are still carrying. Ending with 'what I'd like to leave here' makes the closing explicit, which helps your brain treat the episode as finished.",
      "Do it before you get home rather than after midnight. The point of a detox is to separate the day from the night.",
    ],
  },
  {
    slug: "navigating-vulnerability",
    title: "Navigating Vulnerability: How to Open Up Safely Online",
    teaser: "Be transparent about feelings, private about facts.",
    minutes: 3,
    body: [
      "Vulnerability and exposure are not the same thing. Vulnerability is emotional honesty. Exposure is handing over information that can identify or harm you.",
      "The practical rule: share the feeling in full, share the facts in outline. 'I'm terrified about money' is vulnerable. Your employer, street and bank details are exposure.",
      "Keep these out of any anonymous conversation: full name, workplace, school, address, phone number, social handles, photos with identifiable backgrounds, and anything that could be used to find you.",
      "Pace yourself, too. Notice how you feel after sharing. If a conversation leaves you drained or pressured, end it. Anyone who pushes past a boundary has told you what you needed to know.",
    ],
  },
  {
    slug: "peer-support-vs-therapy",
    title: "Peer Support vs. Professional Therapy: Knowing When and How They Work Together",
    teaser: "Venting is day-to-day relief. It complements professional care - it never replaces it.",
    minutes: 3,
    body: [
      "Peer support and professional care do different jobs. A peer offers presence, perspective and immediate relief. A trained professional offers assessment, structured treatment and continuity over time.",
      "Peer support is a good fit for the ordinary weight of life: stress, loneliness, a bad week, a decision you need to talk through at 1 a.m. when nobody is available.",
      "Seek professional help when distress is persistent rather than passing, when daily functioning slips - sleep, eating, work, relationships - or when you have thoughts of harming yourself. If you are in immediate danger, contact your local emergency number or a crisis line right now.",
      "The two work best side by side: professional care sets the direction, peer conversation carries you through the days between.",
    ],
  },
  {
    slug: "psychology-of-play",
    title: "The Psychology of Play: How Gamified Communication Lowers Social Anxiety",
    teaser: "Levels, prompts and friendly visuals make opening up feel less intimidating.",
    minutes: 3,
    body: [
      "For a socially anxious person, a blank message box is an exam. Every unstructured invitation to 'just say something' triggers the same question: what if I get it wrong?",
      "Playful structure removes that blankness. A prompt gives you a script. A level tells you that showing up counts. A small reward marks progress that would otherwise be invisible.",
      "Play also reframes the stakes. Games are places where trying something and failing is expected, so the cost of an awkward opening line drops close to zero - which is exactly the condition introverts need to start.",
      "The goal is never the points. The points are scaffolding: they hold the conversation up long enough for the real thing to happen, and then you stop noticing them.",
    ],
  },
];