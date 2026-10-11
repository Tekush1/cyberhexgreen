/* Shop sound design. Every sound is synthesized with the Web Audio API:
   no audio files, nothing to download. Kept soft and short on purpose.

   Rules so it never gets irritating:
   - Nothing plays until the visitor has clicked, tapped or pressed a key
     (browsers require that anyway), so there is never sound on page load.
   - One master volume, a compressor, and a light shared reverb tail.
   - Hover sounds are throttled; nothing plays while the tab is hidden.
   - A mute toggle is remembered between visits. */

export type ShopSound =
  | 'enter' | 'discover' | 'pick' | 'add' | 'remove' | 'rush'
  | 'bill' | 'buy' | 'cheer' | 'ready' | 'sad' | 'toggle';

/* Each page area keeps its own on/off choice. The shop is on by default;
   the blog is off by default (people are reading and writing there). */
let KEY = 'cyberhx-shop-sound';
let defaultOff = false;
const MASTER = 0.22;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let verb: GainNode | null = null;
let unlocked = false;
const readMuted = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v ? v === 'off' : defaultOff;
  } catch {
    return defaultOff;
  }
};
let muted = readMuted();
const lastPlayed: Partial<Record<ShopSound, number>> = {};
const listeners = new Set<(m: boolean) => void>();

/** Minimum gap between two plays of the same sound, in ms. */
const THROTTLE: Partial<Record<ShopSound, number>> = { discover: 1600, add: 70, remove: 70, enter: 8000, sad: 4000 };

function build() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER;
  master.connect(comp).connect(ctx.destination);

  // Small generated room: short noise burst with exponential decay.
  const len = Math.floor(ctx.sampleRate * 1.6);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  verb = ctx.createGain();
  verb.gain.value = 0.28;
  verb.connect(conv).connect(master);
}

/** Call once; unlocks audio on the visitor's first real gesture. */
export function initShopSound() {
  if (typeof window === 'undefined' || unlocked) return;
  const unlock = () => {
    if (!ctx) build();
    ctx?.resume();
    unlocked = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

export const isMuted = () => muted;

/** Switch to the sound settings of a page area ("shop" or "blog"). */
export function setSoundScope(scope: 'shop' | 'blog') {
  KEY = `cyberhx-${scope}-sound`;
  defaultOff = scope === 'blog';
  muted = readMuted();
  if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.02);
  listeners.forEach((fn) => fn(muted));
}
export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(KEY, m ? 'off' : 'on');
  } catch {
    /* storage blocked: the setting lasts for this visit */
  }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : MASTER, ctx.currentTime, 0.05);
  listeners.forEach((fn) => fn(m));
  if (!m) playShopSound('toggle');
}

/* ---------- building blocks ---------- */

type ToneOpts = { type?: OscillatorType; gain?: number; attack?: number; decay?: number; wet?: number; detune?: number; glideTo?: number };

function tone(freq: number, at: number, o: ToneOpts = {}) {
  if (!ctx || !master || !verb) return;
  const { type = 'sine', gain = 0.5, attack = 0.005, decay = 0.35, wet = 0.35, detune = 0, glideTo } = o;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + decay * 0.9);
  osc.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * trim, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  osc.connect(g);
  g.connect(master);
  if (wet > 0) {
    const s = ctx.createGain();
    s.gain.value = wet;
    g.connect(s).connect(verb);
  }
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
}

/** Soft bell: a sine with a quiet octave partial on top. */
function bell(freq: number, at: number, gain = 0.4, decay = 0.6) {
  tone(freq, at, { gain, decay, wet: 0.5 });
  tone(freq * 2, at, { gain: gain * 0.18, decay: decay * 0.6, wet: 0.5 });
  tone(freq * 3.01, at, { gain: gain * 0.06, decay: decay * 0.35, wet: 0.4 });
}

function noise(at: number, dur: number, o: { gain?: number; freq?: number; q?: number; sweepTo?: number; type?: BiquadFilterType; wet?: number } = {}) {
  if (!ctx || !master || !verb) return;
  const { gain = 0.3, freq = 1200, q = 1, sweepTo, type = 'bandpass', wet = 0.2 } = o;
  const t = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * trim, t + Math.min(0.04, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  if (wet > 0) {
    const s = ctx.createGain();
    s.gain.value = wet;
    g.connect(s).connect(verb);
  }
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* Notes (Hz) */
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A4: 440, F4: 349.23, D4: 293.66 };

/* Loudness balance (dB), measured offline so every sound lands in a narrow band:
   the success chime is the loudest, small UI ticks sit a little below. */
const TRIM_DB: Record<ShopSound, number> = {
  enter: 6.6, discover: 12, pick: 5.7, add: 16.7, remove: 17.6, rush: 21.4,
  bill: 9.5, buy: 15, cheer: 4.3, ready: 14, sad: 9.3, toggle: 19.4,
};
let trim = 1;

let addStep = 0;
let addReset = 0;

/** Play one of the shop sounds (no-op when muted, locked or hidden). */
export function playShopSound(name: ShopSound) {
  if (muted || !unlocked || !ctx || document.visibilityState === 'hidden') return;
  const now = performance.now();
  const gap = THROTTLE[name];
  if (gap && now - (lastPlayed[name] ?? -1e9) < gap) return;
  lastPlayed[name] = now;
  if (ctx.state === 'suspended') ctx.resume();
  trim = Math.pow(10, TRIM_DB[name] / 20);

  switch (name) {
    case 'enter': // cart rolling in, then a small "hello" chime
      for (let i = 0; i < 6; i++) noise(i * 0.075, 0.05, { gain: 0.05, freq: 900 + i * 40, q: 6, wet: 0.05 });
      bell(N.G5, 0.42, 0.18, 0.5);
      bell(N.C6, 0.52, 0.16, 0.7);
      break;
    case 'discover': // curious sparkle
      tone(N.E6, 0, { gain: 0.09, decay: 0.25, wet: 0.6 });
      tone(N.G6, 0.07, { gain: 0.08, decay: 0.35, wet: 0.6 });
      break;
    case 'pick': // soft pop + "added" two-note chime
      tone(380, 0, { type: 'triangle', gain: 0.22, decay: 0.09, wet: 0.1, glideTo: 180 });
      bell(N.C6, 0.06, 0.26, 0.45);
      bell(N.G6, 0.15, 0.2, 0.6);
      break;
    case 'add': { // quick pluck, nudges up a step each time (resets after a pause)
      const scale = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6];
      const f = scale[addStep % scale.length];
      addStep++;
      window.clearTimeout(addReset);
      addReset = window.setTimeout(() => (addStep = 0), 1500);
      tone(f, 0, { type: 'triangle', gain: 0.22, decay: 0.16, wet: 0.25 });
      tone(f * 2, 0, { gain: 0.05, decay: 0.1, wet: 0.2 });
      break;
    }
    case 'remove': // the same pluck, falling
      tone(N.E5, 0, { type: 'triangle', gain: 0.16, decay: 0.16, wet: 0.2, glideTo: N.A4 });
      break;
    case 'rush': // whoosh
      noise(0, 0.42, { gain: 0.16, freq: 500, sweepTo: 3200, q: 1.4, wet: 0.15 });
      break;
    case 'bill': // receipt printer, then a thoughtful low note
      for (let i = 0; i < 5; i++) noise(i * 0.055, 0.035, { gain: 0.07, freq: 2600, q: 8, wet: 0.05 });
      tone(N.A4, 0.34, { gain: 0.12, decay: 0.4, wet: 0.35 });
      break;
    case 'buy': // a crisp button press
      tone(1800, 0, { type: 'square', gain: 0.05, decay: 0.03, wet: 0.05 });
      tone(240, 0.005, { type: 'sine', gain: 0.2, decay: 0.08, wet: 0.1, glideTo: 140 });
      break;
    case 'cheer': // success: rising major arpeggio with shimmer
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, i * 0.085, 0.24, 0.9));
      [N.E6, N.G6, N.E6 * 1.5].forEach((f, i) => tone(f, 0.38 + i * 0.06, { gain: 0.05, decay: 0.5, wet: 0.7 }));
      break;
    case 'ready': // friendly single ding
      bell(N.G5, 0, 0.22, 0.7);
      break;
    case 'sad': // two soft falling notes, very quiet
      tone(N.A4, 0, { type: 'triangle', gain: 0.1, decay: 0.35, wet: 0.4 });
      tone(N.F4, 0.22, { type: 'triangle', gain: 0.09, decay: 0.6, wet: 0.45, glideTo: N.D4 * 1.12 });
      break;
    case 'toggle':
      tone(N.E6, 0, { gain: 0.08, decay: 0.12, wet: 0.2 });
      break;
  }
  trim = 1;
}
