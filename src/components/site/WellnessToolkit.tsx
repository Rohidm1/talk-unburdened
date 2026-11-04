import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/native";
import { openSos } from "@/lib/safety";

/* ---------- 5-4-3-2-1 grounding ---------- */
const GROUNDING = [
  { n: 5, sense: "see", hint: "Look around. Name five things you can see." },
  { n: 4, sense: "feel", hint: "Notice four things you can physically feel — your feet, your clothes, the chair." },
  { n: 3, sense: "hear", hint: "Listen for three sounds, near or far." },
  { n: 2, sense: "smell", hint: "Find two things you can smell — or two scents you like." },
  { n: 1, sense: "taste", hint: "Notice one thing you can taste, or take a sip of water." },
];

export function Grounding() {
  const [step, setStep] = useState(0);
  const [ticks, setTicks] = useState(0);
  const done = step >= GROUNDING.length;
  const cur = GROUNDING[Math.min(step, GROUNDING.length - 1)]!;

  const tick = () => {
    haptic(8);
    if (ticks + 1 >= cur.n) {
      setTicks(0);
      setStep((s) => s + 1);
    } else setTicks((t) => t + 1);
  };

  return (
    <section className="glass rounded-3xl p-6" aria-labelledby="grounding-title">
      <h2 id="grounding-title" className="font-display text-xl font-semibold">5-4-3-2-1 grounding</h2>
      <p className="mt-1 text-sm text-muted-foreground">Bring yourself back to the here and now, one sense at a time.</p>
      {done ? (
        <div className="mt-6 text-center">
          <p className="text-4xl" aria-hidden>🌿</p>
          <p className="mt-2 font-semibold">You're here. You're grounded.</p>
          <button type="button" onClick={() => setStep(0)} className="mt-4 min-h-12 rounded-full border border-border px-5 text-sm">Start again</button>
        </div>
      ) : (
        <div className="mt-6">
          <p className="font-display text-3xl font-semibold">{cur.n} things you can {cur.sense}</p>
          <p className="mt-2 text-sm text-muted-foreground">{cur.hint}</p>
          <div className="mt-5 flex flex-wrap gap-2" aria-label={`${ticks} of ${cur.n} named`}>
            {Array.from({ length: cur.n }).map((_, i) => (
              <span key={i} className={`size-4 rounded-full ${i < ticks ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <button type="button" onClick={tick} className="mt-5 min-h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            Got one ({ticks}/{cur.n})
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------- Journaling prompts ---------- */
const PROMPTS = [
  "What's taking up the most space in your head right now?",
  "Write about something you're carrying that isn't yours to carry.",
  "What would you tell a friend who felt the way you feel today?",
  "Name one thing that went okay today, however small.",
  "What do you need more of this week? What do you need less of?",
  "Describe a place where you feel calm, in as much detail as you can.",
  "What's one worry you can let go of for tonight?",
  "Finish this sentence: 'I'm proud that I…'",
];
const JOURNAL_KEY = "at.journal";

export function Journal() {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    setI(new Date().getDate() % PROMPTS.length);
    setText(window.localStorage.getItem(JOURNAL_KEY) ?? "");
    setCount(Number(window.localStorage.getItem(`${JOURNAL_KEY}.count`) ?? 0));
  }, []);

  const save = () => {
    window.localStorage.setItem(JOURNAL_KEY, text);
    const n = count + 1;
    window.localStorage.setItem(`${JOURNAL_KEY}.count`, String(n));
    setCount(n);
    haptic(12);
    toast.success("Saved on this device only.");
  };

  return (
    <section className="glass rounded-3xl p-6" aria-labelledby="journal-title">
      <h2 id="journal-title" className="font-display text-xl font-semibold">Stress-release journal</h2>
      <p className="mt-3 font-medium">{PROMPTS[i]}</p>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 4000))} rows={5} placeholder="Write freely. Nobody else will see this." aria-label="Journal entry" className="mt-3 w-full rounded-2xl border border-input bg-background/50 p-3 text-sm" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setI((v) => (v + 1) % PROMPTS.length)} className="inline-flex min-h-10 items-center gap-1 text-sm text-primary"><RefreshCw className="size-4" /> New prompt</button>
        <button type="button" onClick={save} className="min-h-12 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Save privately</button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Stored only in this browser — never sent to us.{count ? ` ${count} entries saved.` : ""}</p>
    </section>
  );
}

/* ---------- Affirmations ---------- */
const OPEN = ["I am", "I'm allowed to be", "Today I choose to be", "Little by little I'm becoming"];
const QUALITY = ["enough", "patient with myself", "steady", "worthy of kindness", "learning", "safe in this moment", "stronger than this feeling", "gentle with my mind"];
const CLOSE = ["", "— and that's okay.", ", one breath at a time.", ", even on hard days.", "."];

export function Affirmations() {
  const [seed, setSeed] = useState(0);
  const line = useMemo(() => {
    const r = (n: number, k: number) => (seed * 7 + k * 13 + seed * k) % n;
    const close = CLOSE[r(CLOSE.length, 3)]!;
    return `${OPEN[r(OPEN.length, 1)]} ${QUALITY[r(QUALITY.length, 2)]}${close.startsWith(",") || close === "." ? close : close ? ` ${close}` : "."}`;
  }, [seed]);

  return (
    <section className="glass flex flex-col rounded-3xl p-6" aria-labelledby="affirm-title">
      <h2 id="affirm-title" className="font-display text-xl font-semibold">Affirmation generator</h2>
      <p className="my-6 flex-1 text-center font-display text-2xl leading-snug" aria-live="polite">“{line}”</p>
      <button
        type="button"
        onClick={() => {
          haptic(8);
          setSeed((s) => s + 1 + Math.floor(Math.random() * 5));
        }}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/10 text-sm font-semibold text-primary"
      >
        <Sparkles className="size-4" /> Another one
      </button>
    </section>
  );
}

/* ---------- Daily reflection / mood tracker ---------- */
const MOODS = [
  { v: 1, emoji: "😞", label: "Heavy" },
  { v: 2, emoji: "😕", label: "Low" },
  { v: 3, emoji: "😐", label: "Okay" },
  { v: 4, emoji: "🙂", label: "Good" },
  { v: 5, emoji: "😄", label: "Great" },
];
const TIPS: Record<number, string> = {
  1: "Heavy days are real. Try one minute of Mood SOS, then reach out — a chat or a helpline. You don't have to carry it alone.",
  2: "Lower energy today. Something small: a glass of water, a short walk, or one kind note to yourself.",
  3: "An okay day is a fine day. Notice one thing you'd like more of tomorrow.",
  4: "Nice. What helped today? Write it down so you can come back to it.",
  5: "Love that. Consider passing it on — reply to a bottle or encourage someone in the community.",
};
const MOOD_KEY = "at.moods";
type MoodLog = Record<string, { v: number; note?: string }>;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function MoodTracker() {
  const [log, setLog] = useState<MoodLog>({});
  const [note, setNote] = useState("");
  const today = dayKey(new Date());

  useEffect(() => {
    try {
      setLog(JSON.parse(window.localStorage.getItem(MOOD_KEY) ?? "{}") as MoodLog);
    } catch {
      setLog({});
    }
  }, []);

  const pick = (v: number) => {
    haptic(10);
    const n = note || log[today]?.note;
    const next: MoodLog = { ...log, [today]: n ? { v, note: n } : { v } };
    setLog(next);
    window.localStorage.setItem(MOOD_KEY, JSON.stringify(next));
  };

  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d), label: d.toLocaleDateString("en-GB", { weekday: "narrow" }), entry: log[dayKey(d)] };
  });
  const values = week.map((w) => w.entry?.v).filter((v): v is number => !!v);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const todayV = log[today]?.v;
  const lowStreak = week.slice(-3).every((w) => (w.entry?.v ?? 5) <= 2);

  return (
    <section className="glass rounded-3xl p-6 lg:col-span-2" aria-labelledby="mood-title">
      <h2 id="mood-title" className="font-display text-xl font-semibold">Daily reflection</h2>
      <p className="mt-1 text-sm text-muted-foreground">How are you feeling today? Saved on this device only.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Today's mood">
        {MOODS.map((m) => (
          <button key={m.v} type="button" role="radio" aria-checked={todayV === m.v} onClick={() => pick(m.v)} className={`flex min-h-16 min-w-16 flex-col items-center justify-center rounded-2xl border text-xs ${todayV === m.v ? "border-primary bg-primary/15" : "border-border"}`}>
            <span className="text-2xl" aria-hidden>{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))} onBlur={() => todayV && pick(todayV)} placeholder="One line about today (optional)" className="mt-3 min-h-12 w-full rounded-xl border border-input bg-background/50 px-3 text-sm" />
      {todayV ? <p className="mt-4 rounded-2xl bg-primary/10 p-4 text-sm">{TIPS[todayV]}</p> : null}
      {lowStreak ? (
        <button type="button" onClick={openSos} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full border border-primary/50 px-5 text-sm text-primary">
          <LifeBuoy className="size-4" /> A few heavy days in a row — try Mood SOS
        </button>
      ) : null}
      <div className="mt-5 flex items-end gap-2" aria-label="Last 7 days">
        {week.map((w) => (
          <div key={w.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-20 w-full items-end rounded-lg bg-muted/40">
              <div className="w-full rounded-lg bg-primary/70" style={{ height: `${((w.entry?.v ?? 0) / 5) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{w.label}</span>
          </div>
        ))}
      </div>
      {avg ? <p className="mt-3 text-xs text-muted-foreground">7-day average: {avg.toFixed(1)} / 5</p> : null}
    </section>
  );
}
