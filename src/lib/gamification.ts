import { useCallback, useEffect, useState } from "react";
import { playSfx } from "./sfx";

/** Client-side progression store (localStorage). Purely cosmetic/engagement. */
const KEY = "at.progress.v1";
const EVENT = "at:progress";

export type QuestId = "chat5" | "icebreaker" | "article" | "compliment";

export type Progress = {
  xp: number;
  streak: number;
  lastVisit: string | null;
  quests: Record<string, string | undefined>; // questId -> completion day
  readArticles: string[];
  theme: "neon" | "gold" | "acid";
};

export const QUESTS: { id: QuestId; label: string; xp: number }[] = [
  { id: "chat5", label: "Chat for 5 minutes", xp: 40 },
  { id: "icebreaker", label: "Send an icebreaker", xp: 15 },
  { id: "article", label: "Read a mental health article", xp: 20 },
  { id: "compliment", label: "Send a compliment after a chat", xp: 15 },
];

export const THEMES: { id: Progress["theme"]; label: string; level: number }[] = [
  { id: "neon", label: "Neon Violet", level: 1 },
  { id: "gold", label: "Cyberpunk Gold", level: 5 },
  { id: "acid", label: "Acid Green", level: 10 },
];

const empty: Progress = {
  xp: 0,
  streak: 0,
  lastVisit: null,
  quests: {},
  readArticles: [],
  theme: "neon",
};

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Level curve: level n needs 100 * n XP in total steps of 100, 150, 200… */
export function levelFromXp(xp: number) {
  let level = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    level += 1;
    need = 100 + (level - 1) * 50;
  }
  return { level, into: rest, need, pct: Math.round((rest / need) * 100) };
}

export function readProgress(): Progress {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<Progress>) } : empty;
  } catch {
    return empty;
  }
}

function write(next: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
}

export function floatXp(amount: number, label?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("at:xp", { detail: { amount, label: label ?? `+${amount} XP` } }),
  );
}

export function awardXp(amount: number, label?: string) {
  const current = readProgress();
  const before = levelFromXp(current.xp).level;
  const next = { ...current, xp: current.xp + amount };
  write(next);
  floatXp(amount, label);
  const after = levelFromXp(next.xp).level;
  playSfx(after > before ? "levelup" : "xp");
  if (after > before) {
    window.dispatchEvent(new CustomEvent("at:levelup", { detail: after }));
  }
}

export function completeQuest(id: QuestId) {
  const current = readProgress();
  if (current.quests[id] === today()) return;
  write({ ...current, quests: { ...current.quests, [id]: today() } });
  const quest = QUESTS.find((q) => q.id === id);
  awardXp(quest?.xp ?? 10, `Quest complete +${quest?.xp ?? 10} XP`);
}

export function markArticleRead(slug: string) {
  const current = readProgress();
  if (current.readArticles.includes(slug)) return false;
  write({ ...current, readArticles: [...current.readArticles, slug] });
  awardXp(20, "+20 XP · article read");
  completeQuest("article");
  return true;
}

export function setTheme(theme: Progress["theme"]) {
  write({ ...readProgress(), theme });
}

function touchStreak(current: Progress): Progress {
  const day = today();
  if (current.lastVisit === day) return current;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = current.lastVisit === yesterday ? current.streak + 1 : 1;
  return { ...current, lastVisit: day, streak };
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(empty);

  useEffect(() => {
    const initial = touchStreak(readProgress());
    write(initial);
    const onChange = (e: Event) => setProgress((e as CustomEvent<Progress>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset["theme"] = progress.theme;
  }, [progress.theme]);

  const level = levelFromXp(progress.xp);
  const isQuestDone = useCallback(
    (id: QuestId) => progress.quests[id] === today(),
    [progress.quests],
  );

  return { progress, ...level, isQuestDone };
}