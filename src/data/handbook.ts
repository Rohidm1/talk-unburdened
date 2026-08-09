export type Block =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "callout"; tone: "danger" | "warning" | "info" | "success"; title: string; body: string; items?: string[] }
  | { kind: "quote"; text: string }
  | { kind: "chips"; label: string; items: string[]; tone?: "danger" | "info" }
  | { kind: "steps"; items: { title: string; body: string }[] }
  | { kind: "mock"; variant: "queue" | "profile" | "editor" | "stats" | "report"; caption: string };

export type Subsection = { id: string; title: string; blocks: Block[] };
export type Section = { id: string; number: string; title: string; summary: string; icon: string; subsections: Subsection[] };

export const handbook: Section[] = [
  {
    id: "welcome",
    number: "1",
    title: "Welcome & Role Overview",
    summary: "What the job is, who you talk to, and when to be online.",
    icon: "Hand",
    subsections: [
      {
        id: "role",
        title: "Your position",
        blocks: [
          { kind: "text", text: "Position: Freelance Chat Support Agent." },
          {
            kind: "text",
            text: "Nature of work: engaging in lively, entertaining and high-quality chat conversations using assigned fictional profiles.",
          },
          { kind: "text", text: "Target audience: the majority of users on the platform are located in the United States (US / USA)." },
        ],
      },
      {
        id: "peak-hours",
        title: "Peak working hours",
        blocks: [
          {
            kind: "text",
            text: "Because the focus is primarily on the US market, peak activity falls mainly during US evening and night hours — late evening to early morning European time (EST & PST peak hours).",
          },
          {
            kind: "callout",
            tone: "success",
            title: "Log in during peak hours",
            body: "Agents are strongly encouraged to be online during US peak times to maximize chat volume and earnings.",
          },
        ],
      },
    ],
  },
  {
    id: "privacy",
    number: "2",
    title: "Privacy, Safety & Anonymity",
    summary: "You are fully anonymous — and you stay in character.",
    icon: "ShieldCheck",
    subsections: [
      {
        id: "anonymity",
        title: "100% anonymity guaranteed",
        blocks: [
          {
            kind: "text",
            text: "Your real name, location, photos and personal contact details are NEVER shown to users or third parties.",
          },
          {
            kind: "text",
            text: "Fictional profiles: you chat strictly under the identity of the assigned fictional profile. You must remain in character at all times.",
          },
          {
            kind: "callout",
            tone: "danger",
            title: "Never share personal contact information",
            body: "Sharing your own contact details — or those of fellow agents — on the platform is strictly prohibited for your own safety and privacy.",
          },
        ],
      },
    ],
  },
  {
    id: "quality",
    number: "3",
    title: 'Message Quality & "The Customer is King"',
    summary: "Respect, retention and writing that keeps people talking.",
    icon: "Crown",
    subsections: [
      {
        id: "customer-king",
        title: "The customer is king",
        blocks: [
          {
            kind: "text",
            text: "Treat every user with respect, patience and genuine interest — even if a customer becomes frustrated or demanding.",
          },
        ],
      },
      {
        id: "retention",
        title: "Conversation retention (maximize chat duration)",
        blocks: [
          { kind: "text", text: "The primary objective is to keep the customer engaged in the conversation for as long as possible." },
          {
            kind: "list",
            items: [
              "Always end your messages with open-ended questions to keep the dialogue flowing naturally.",
              "Tailor your replies to the emotional tone, interests and personal details shared by the customer.",
              "Reference earlier details from the conversation — it makes the chat feel personal and real.",
            ],
          },
        ],
      },
      {
        id: "standards",
        title: "Quality standards",
        blocks: [
          {
            kind: "list",
            items: [
              "Use proper American English grammar and natural phrasing.",
              "Type complete, creative and engaging sentences.",
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Lazy replies are forbidden",
            body: 'One-word or throwaway replies may be rejected during quality reviews.',
            items: ['"Ok"', '"Yes"', '"Lol"', '"Wbu?"'],
          },
        ],
      },
    ],
  },
  {
    id: "earnings",
    number: "4",
    title: "Earnings, Quality & Payouts",
    summary: "How you get paid, how often, and how to earn more.",
    icon: "Wallet",
    subsections: [
      {
        id: "remuneration",
        title: "Per-message remuneration",
        blocks: [
          { kind: "text", text: "You are paid as a freelancer for every valid, approved message response." },
          {
            kind: "list",
            items: [
              "High message quality and strong retention directly generate higher message volume and longer chats.",
              "Top-performing agents receive priority routing for incoming chats.",
              "Top performers are eligible for performance bonuses and higher per-message rates.",
            ],
          },
        ],
      },
      {
        id: "payouts",
        title: "Payout frequency & methods",
        blocks: [
          { kind: "text", text: "Payout frequency: bi-weekly (every 14 days)." },
          { kind: "chips", label: "Supported payment methods", items: ["Wise", "Payoneer", "PayPal", "Revolut", "N26"], tone: "info" },
        ],
      },
    ],
  },
  {
    id: "rules",
    number: "5",
    title: "Community Rules, Restrictions & Forbidden Terms",
    summary: "The words you can never type and the conduct rules you never break.",
    icon: "Ban",
    subsections: [
      {
        id: "forbidden-words",
        title: "Forbidden words & terms (strictly prohibited)",
        blocks: [
          { kind: "text", text: "The following words, or any variation of them, must NEVER be used in chat:" },
          {
            kind: "chips",
            label: "Never type these",
            tone: "danger",
            items: ["AI", "Bot", "Robot", "Computer", "System", "Script", "Automated", "Agent", "Operator", "Employee", "Support"],
          },
          {
            kind: "callout",
            tone: "danger",
            title: "Never break character",
            body: "Never reference that you are working behind a screen, inside a system, or through a fictional profile.",
          },
        ],
      },
      {
        id: "conduct",
        title: "Strict conduct rules",
        blocks: [
          {
            kind: "list",
            ordered: true,
            items: [
              "No exchange of personal contact information — never ask for or provide phone numbers, email addresses, social media handles (Instagram, Snapchat, etc.) or home addresses.",
              "No financial or scam solicitations — requesting money, gift cards, crypto or external payments is strictly forbidden.",
              "No hate speech or illegal activities — zero tolerance for discrimination, extremism or promotion of illegal acts.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "crisis",
    number: "6",
    title: "Emergency Protocol: Suicide & Crisis Handling",
    summary: "Exactly what to do if a user mentions self-harm or acute distress.",
    icon: "LifeBuoy",
    subsections: [
      {
        id: "protocol",
        title: "If a user mentions self-harm or severe distress",
        blocks: [
          {
            kind: "callout",
            tone: "danger",
            title: "Crucial — follow every step",
            body: "This protocol applies the moment a user mentions self-harm, suicidal ideation or severe acute distress.",
          },
          {
            kind: "steps",
            items: [
              {
                title: "Stay calm and empathetic",
                body: "Express empathy without stepping into the role of a licensed therapist or mental health professional.",
              },
              {
                title: "Provide the official US Suicide & Crisis Lifeline",
                body: "Most users are US-based — share the official crisis support details immediately.",
              },
              {
                title: "Flag the chat immediately",
                body: 'Use the "Report / Flag Chat" button on the dashboard to alert the moderation and management team right away.',
              },
            ],
          },
          {
            kind: "quote",
            text: "If you are feeling overwhelmed and need support, please know you are not alone. You can call or text the Suicide & Crisis Lifeline at 988 (US) or visit 988lifeline.org for free, confidential support 24/7.",
          },
        ],
      },
    ],
  },
  {
    id: "dashboard",
    number: "7",
    title: "Dashboard Walkthrough",
    summary: "A visual step-by-step tour of every area of your agent dashboard.",
    icon: "LayoutDashboard",
    subsections: [
      {
        id: "queue",
        title: "1. Inbound Queue",
        blocks: [
          { kind: "text", text: 'Displays waiting incoming messages from US clients. Click "Claim Chat" to begin answering.' },
          { kind: "mock", variant: "queue", caption: "Claim the oldest waiting chat first — response speed affects routing priority." },
        ],
      },
      {
        id: "profile-panel",
        title: "2. Profile & History Panel",
        blocks: [
          { kind: "text", text: "View the details and persona of the fictional profile you are currently adopting." },
          {
            kind: "text",
            text: "Review past chat history and saved notes (hobbies, name, previous topics) to personalize your replies.",
          },
          { kind: "mock", variant: "profile", caption: "Always skim notes before your first reply — it instantly makes the chat feel continuous." },
        ],
      },
      {
        id: "editor",
        title: "3. Chat Editor & Tools",
        blocks: [
          { kind: "text", text: "A text editor equipped with a character counter, emoji picker and quick-access notes for reference." },
          { kind: "mock", variant: "editor", caption: "Aim for two to four full sentences that end on an open question." },
        ],
      },
      {
        id: "stats",
        title: "4. Stats & Earnings Tracker (real-time)",
        blocks: [
          { kind: "text", text: "A live header counter showing your total answered messages for the current shift alongside estimated earnings." },
          { kind: "mock", variant: "stats", caption: "Numbers update live as approved messages come in." },
        ],
      },
      {
        id: "report",
        title: "5. Report & Escalate Button",
        blocks: [
          { kind: "text", text: "Used for reporting policy violations, abusive behavior or crisis / suicide situations." },
          { kind: "mock", variant: "report", caption: "When in doubt, escalate. Reporting is never penalized." },
        ],
      },
    ],
  },
];
