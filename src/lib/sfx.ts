/**
 * Tiny WebAudio synth for futuristic UI feedback. No assets, no deps.
 * Muting is remembered in localStorage.
 */
const MUTE_KEY = "at.sfx.muted";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  window.dispatchEvent(new CustomEvent("at:mute", { detail: muted }));
}

function blip(freq: number, start: number, duration: number, gain = 0.06, type: OscillatorType = "sine") {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  vol.gain.setValueAtTime(0.0001, ac.currentTime + start);
  vol.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

export type SfxName = "send" | "receive" | "match" | "levelup" | "xp" | "click" | "dice";

const recipes: Record<SfxName, () => void> = {
  click: () => blip(680, 0, 0.08, 0.035, "triangle"),
  send: () => {
    blip(620, 0, 0.09, 0.05, "triangle");
    blip(920, 0.05, 0.1, 0.04, "sine");
  },
  receive: () => blip(480, 0, 0.14, 0.045, "sine"),
  dice: () => {
    blip(300, 0, 0.05, 0.04, "square");
    blip(420, 0.05, 0.05, 0.035, "square");
    blip(760, 0.11, 0.1, 0.04, "triangle");
  },
  xp: () => {
    blip(880, 0, 0.08, 0.04, "sine");
    blip(1320, 0.07, 0.12, 0.035, "sine");
  },
  match: () => {
    blip(523, 0, 0.12, 0.05, "sine");
    blip(784, 0.1, 0.14, 0.05, "sine");
    blip(1046, 0.22, 0.2, 0.045, "triangle");
  },
  levelup: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, i * 0.08, 0.22, 0.05, "triangle"));
  },
};

export function playSfx(name: SfxName) {
  if (isMuted()) return;
  try {
    recipes[name]();
  } catch {
    /* audio is a nicety, never a failure path */
  }
}