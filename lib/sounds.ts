"use client";

export type SoundKind =
  | "join"
  | "leave"
  | "start"
  | "pick"
  | "tick"
  | "cross"
  | "correct"
  | "wrong"
  | "win"
  | "lose"
  | "sabotage"
  | "crack";

const MUTE_KEY = "gd-muted";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// One oscillator + gain envelope, optionally pitch-bent from `freq` to `endFreq`.
function tone(
  audio: AudioContext,
  {
    freq,
    endFreq,
    start,
    duration,
    type = "sine",
    peakGain = 0.18,
  }: {
    freq: number;
    endFreq?: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    peakGain?: number;
  }
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  const t0 = audio.currentTime + start;
  const t1 = t0 + duration;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t1);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.02, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function playInternal(kind: SoundKind, audio: AudioContext) {
  switch (kind) {
    case "join":
      tone(audio, { freq: 520, endFreq: 780, start: 0, duration: 0.1, type: "triangle" });
      tone(audio, { freq: 780, start: 0.09, duration: 0.12, type: "triangle" });
      break;
    case "leave":
      tone(audio, { freq: 500, endFreq: 260, start: 0, duration: 0.16, type: "sine", peakGain: 0.14 });
      break;
    case "start":
      tone(audio, { freq: 300, endFreq: 720, start: 0, duration: 0.22, type: "sawtooth", peakGain: 0.15 });
      tone(audio, { freq: 720, start: 0.2, duration: 0.16, type: "triangle", peakGain: 0.18 });
      break;
    case "pick":
      tone(audio, { freq: 440, start: 0, duration: 0.07, type: "triangle", peakGain: 0.14 });
      tone(audio, { freq: 587, start: 0.06, duration: 0.09, type: "triangle", peakGain: 0.14 });
      break;
    case "tick":
      tone(audio, { freq: 600, start: 0, duration: 0.05, type: "square", peakGain: 0.12 });
      break;
    case "cross":
      tone(audio, { freq: 340, start: 0, duration: 0.05, type: "square", peakGain: 0.1 });
      break;
    case "correct":
      tone(audio, { freq: 523, start: 0, duration: 0.09, type: "triangle" });
      tone(audio, { freq: 659, start: 0.08, duration: 0.09, type: "triangle" });
      tone(audio, { freq: 880, start: 0.16, duration: 0.14, type: "triangle" });
      break;
    case "wrong":
      tone(audio, { freq: 220, endFreq: 140, start: 0, duration: 0.18, type: "sawtooth", peakGain: 0.14 });
      break;
    case "win":
      tone(audio, { freq: 523, start: 0, duration: 0.1, type: "triangle" });
      tone(audio, { freq: 659, start: 0.1, duration: 0.1, type: "triangle" });
      tone(audio, { freq: 784, start: 0.2, duration: 0.1, type: "triangle" });
      tone(audio, { freq: 1047, start: 0.3, duration: 0.28, type: "triangle" });
      break;
    case "lose":
      // "wak wak wak" — three descending trombone-style pitch-bent notes
      tone(audio, { freq: 300, endFreq: 220, start: 0, duration: 0.22, type: "sawtooth", peakGain: 0.16 });
      tone(audio, { freq: 260, endFreq: 190, start: 0.28, duration: 0.22, type: "sawtooth", peakGain: 0.16 });
      tone(audio, { freq: 220, endFreq: 130, start: 0.56, duration: 0.4, type: "sawtooth", peakGain: 0.18 });
      break;
    case "sabotage":
      // a mischievous little "plant the trap" blip
      tone(audio, { freq: 700, endFreq: 500, start: 0, duration: 0.08, type: "square", peakGain: 0.14 });
      tone(audio, { freq: 500, endFreq: 350, start: 0.09, duration: 0.1, type: "square", peakGain: 0.14 });
      break;
    case "crack":
      // a sharp eggshell snap
      tone(audio, { freq: 950, endFreq: 110, start: 0, duration: 0.12, type: "sawtooth", peakGain: 0.2 });
      tone(audio, { freq: 200, endFreq: 90, start: 0.02, duration: 0.14, type: "square", peakGain: 0.12 });
      break;
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore
  }
}

export function playSound(kind: SoundKind) {
  if (isMuted()) return;
  try {
    const audio = getContext();
    if (!audio) return;
    playInternal(kind, audio);
  } catch {
    // sound is best-effort; never let it break gameplay
  }
}
