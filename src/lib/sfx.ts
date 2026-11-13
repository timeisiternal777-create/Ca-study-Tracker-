// Sound engine for UI feedback.
//
// The sounds are short recordings of synthesised wood, glass and bell hits (the Voyage kit is ship timber, plucked tines and a small bronze bell). They are rendered offline by
// tools/sfx/build_sfx.py into one small file per kit (public/sfx/<kit>.flac plus a .json index).
// This module loads a kit, plays it through the Web Audio API, and decides which sound belongs to which tap.
//
//  * One document-level listener gives every button, chip, tab, switch and checkbox its own sound by role.
//    Put data-sfx="none" (or a sound name) on any element to override it.
//  * Code that already knows better (a reward, a toast, a modal) calls sfx.play(name). If that happens during a
//    click, the automatic sound for that click is skipped so the two never stack.
//  * Sounds are ranked. A louder moment fades out a quiet tail instead of playing on top of it, and echoes of the
//    same rank within a short window are dropped, so a save never plays "tick + toast + chime" at once.
//  * Press sounds get a tiny random pitch and level change, so repeating taps do not sound like a machine gun.

export type SfxName =
  | 'tap' | 'primary' | 'select' | 'nav' | 'switchOn' | 'switchOff' | 'checkOn' | 'checkOff' | 'step' | 'detent' | 'copy' | 'undo' | 'delete'
  | 'open' | 'close' | 'error' | 'toastGood' | 'toastInfo' | 'toastWarn' | 'toastBad'
  | 'success' | 'save' | 'goal' | 'week' | 'quest' | 'badge' | 'rank' | 'freeze'
  | 'blipHello' | 'blipOpen' | 'blipClose' | 'blipPop' | 'blipDrop' | 'tourNext' | 'tourBack' | 'tourDone'
  | 'timerStart' | 'timerPause' | 'timerResume' | 'timerMark' | 'timerDone';

export type KitId = 'soft' | 'glass' | 'voyage' | 'lantern';
/** full: every control has a sound. light: only switches, confirmations, notices and rewards. */
export type SfxLevel = 'full' | 'light';

export interface PlayOpts {
  /** Shift the pitch by this many semitones. */
  semitones?: number;
  /** Stereo position, -1 (left) to 1 (right). Kept small on purpose. */
  pan?: number;
  /** Extra gain, 1 = as recorded. */
  gain?: number;
  /** Skip the level setting and the echo rules (used by the Sound lab). */
  force?: boolean;
}

interface Def {
  label: string;
  group: string;
  /** 1 press, 2 confirmation, 3 notice, 4 reward, 5 rank-up. */
  prio: 1 | 2 | 3 | 4 | 5;
  /** Tiny random pitch and level change on every play. Off for anything musical. */
  vary: boolean;
  /** Still plays when the level is "light". */
  light: boolean;
  /** Phone vibration in ms (a single tick or a pattern). */
  buzz: number | number[];
}

const D = (label: string, group: string, prio: Def['prio'], o: Partial<Pick<Def, 'vary' | 'light' | 'buzz'>> = {}): Def =>
  ({ label, group, prio, vary: o.vary ?? prio === 1, light: o.light ?? prio > 1, buzz: o.buzz ?? 0 });

export const SOUNDS: Record<SfxName, Def> = {
  tap: D('Tap', 'Buttons', 1, { buzz: 5 }),
  primary: D('Main button', 'Buttons', 2, { vary: true, buzz: 9 }),
  select: D('Choose', 'Buttons', 1, { buzz: 5 }),
  nav: D('Go to screen', 'Buttons', 1, { buzz: 5 }),
  switchOn: D('Switch on', 'Switches and checks', 1, { light: true, buzz: 8 }),
  switchOff: D('Switch off', 'Switches and checks', 1, { light: true, buzz: 6 }),
  checkOn: D('Tick off', 'Switches and checks', 2, { vary: true, buzz: 10 }),
  checkOff: D('Untick', 'Switches and checks', 1, { light: true, buzz: 5 }),
  step: D('Step', 'Controls', 1, { buzz: 4 }),
  detent: D('Slider notch', 'Controls', 1, { buzz: 3 }),
  copy: D('Copy', 'Controls', 2, { vary: true, buzz: 6 }),
  undo: D('Undo', 'Controls', 1, { light: true, buzz: 6 }),
  delete: D('Delete', 'Controls', 2, { vary: true, buzz: [10, 30, 14] }),
  open: D('Panel opens', 'Panels', 1, { light: true, buzz: 6 }),
  close: D('Panel closes', 'Panels', 1, { light: true, buzz: 4 }),
  error: D('Needs attention', 'Notices', 3, { buzz: [14, 40, 14] }),
  toastGood: D('Good news', 'Notices', 2, { buzz: 8 }),
  toastInfo: D('Heads-up', 'Notices', 2, { buzz: 0 }),
  toastWarn: D('Careful', 'Notices', 2, { buzz: [10, 30, 10] }),
  toastBad: D('Problem', 'Notices', 3, { buzz: [14, 40, 14] }),
  success: D('Well done', 'Rewards', 4, { buzz: [10, 40, 16] }),
  save: D('Saved', 'Rewards', 2, { buzz: 10 }),
  goal: D('Daily goal', 'Rewards', 4, { buzz: [12, 40, 12, 40, 22] }),
  week: D('Goal week', 'Rewards', 4, { buzz: [12, 40, 12, 40, 12, 40, 26] }),
  quest: D('Quest collected', 'Rewards', 4, { buzz: [10, 40, 16] }),
  badge: D('Badge', 'Rewards', 4, { buzz: [12, 40, 12, 40, 22] }),
  rank: D('Rank up', 'Rewards', 5, { buzz: [14, 50, 14, 50, 26] }),
  freeze: D('Streak freeze', 'Rewards', 4, { buzz: [10, 40, 16] }),
  timerStart: D('Timer starts', 'Timer', 2, { buzz: [8, 30, 14] }),
  timerPause: D('Timer pauses', 'Timer', 2, { buzz: 8 }),
  timerResume: D('Timer resumes', 'Timer', 2, { buzz: 8 }),
  timerMark: D('Time marker', 'Timer', 3, { buzz: 0 }),
  timerDone: D('Session saved', 'Timer', 4, { buzz: [10, 40, 16] }),
  blipHello: D('Blip says hi', 'Blip and tour', 2, { buzz: 0 }),
  blipOpen: D('Blip opens', 'Blip and tour', 2, { light: true, buzz: 6 }),
  blipClose: D('Blip closes', 'Blip and tour', 1, { light: true, buzz: 0 }),
  blipPop: D('Blip speaks', 'Blip and tour', 1, { light: false, buzz: 0 }),
  blipDrop: D('Blip lands', 'Blip and tour', 1, { light: false, buzz: 5 }),
  tourNext: D('Tour next', 'Blip and tour', 2, { vary: true, buzz: 6 }),
  tourBack: D('Tour back', 'Blip and tour', 1, { light: true, buzz: 4 }),
  tourDone: D('Tour finished', 'Blip and tour', 4, { buzz: [10, 40, 16] }),
};

/** A kit that does not have a recording for a role yet plays this one instead. */
const STAND_IN: Partial<Record<SfxName, SfxName>> = { timerStart: 'primary', timerPause: 'switchOff', timerResume: 'switchOn', timerMark: 'toastInfo', timerDone: 'save' };

export type HapticKind = 'select' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
/** Vibration patterns for gestures (see `Sfx.haptic`). Milliseconds on, then off, then on... */
const HAPTICS: Record<HapticKind, number | number[]> = {
  select: 6, light: 9, medium: 15, heavy: 24,
  success: [10, 40, 18], warning: [14, 36, 14], error: [18, 40, 18, 40, 26],
};

export const SOUND_NAMES = Object.keys(SOUNDS) as SfxName[];
export const SOUND_GROUPS = ['Buttons', 'Switches and checks', 'Controls', 'Panels', 'Notices', 'Rewards', 'Timer', 'Blip and tour'] as const;
export const KITS: { id: KitId; label: string; hint: string }[] = [
  { id: 'soft', label: 'Soft', hint: 'Warm, wooden, round' },
  { id: 'glass', label: 'Glass', hint: 'Bright, airy, clear' },
  { id: 'voyage', label: 'Voyage', hint: 'Ship timber, plucked notes and a small bell' },
  { id: 'lantern', label: 'Lantern', hint: 'Glass lanterns, a school handbell and soft celesta notes' },
];

/** Semitone offsets of a major pentatonic scale, so stepping through values always sounds pleasant. */
const PENTA = [0, 2, 4, 7, 9];
export const penta = (degree: number) => PENTA[((degree % 5) + 5) % 5] + 12 * Math.floor(degree / 5);

// ───────────────────────── choosing a sound for a tap ─────────────────────────

const TEXTY = new Set(['text', 'search', 'number', 'date', 'time', 'email', 'password', 'url', 'tel', 'datetime-local', 'month', 'week', 'range', 'color', 'file']);
const ACTIONABLE = 'button, a[href], summary, label, select, input, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="option"], [data-sfx]';

/** Finds the control that was tapped, even when the tap landed on an icon or label inside it. */
function actionable(start: EventTarget | null): Element | null {
  const el0 = start instanceof Element ? start : null;
  if (!el0) return null;
  const hit = el0.closest(ACTIONABLE);
  if (hit && hit !== document.body) return hit;
  // A div or span with its own click handler: look for the element that asked for the pointer cursor.
  if (getComputedStyle(el0).cursor !== 'pointer') return null;
  let top: Element = el0;
  for (let i = 0; i < 8 && top.parentElement && top.parentElement !== document.body && getComputedStyle(top.parentElement).cursor === 'pointer'; i++) top = top.parentElement;
  return top;
}

interface Choice { name: SfxName | null; dyn?: 'switch' | 'check' }

function classify(el0: Element): Choice {
  let el: Element = el0;
  if (el.tagName === 'LABEL') { const c = (el as HTMLLabelElement).control; if (c) el = c; else return { name: null }; }
  const authored = el.closest('[data-sfx]')?.getAttribute('data-sfx');
  if (authored) return authored === 'none' ? { name: null } : { name: (authored in SOUNDS ? authored : 'tap') as SfxName };
  const role = el.getAttribute('role');
  const tag = el.tagName;
  const type = tag === 'INPUT' ? (el as HTMLInputElement).type : '';
  if (tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && TEXTY.has(type))) return { name: null };
  if (role === 'switch' || el.classList.contains('switch')) return { name: null, dyn: 'switch' };
  if (type === 'checkbox' || role === 'checkbox') return { name: null, dyn: 'check' };
  if (el.closest('.nav-item, .bn-item, .more-item, .sect-tab, .profile-chip, .xp-pill, [data-nav]')) return { name: 'nav' };
  if (type === 'radio' || role === 'radio' || role === 'tab' || role === 'option' || role === 'menuitemradio') return { name: 'select' };
  if (el.closest('.seg') || el.classList.contains('chip') || el.hasAttribute('aria-pressed')) return { name: 'select' };
  if (el.classList.contains('btn--primary')) return { name: 'primary' };
  if (el.classList.contains('btn--danger-solid')) return { name: 'delete' };
  return { name: 'tap' };
}

/** Which sound a control will make when tapped. Used by tests; 'switch' and 'check' pick on or off from the new state. */
export function soundFor(el: Element): SfxName | 'switch' | 'check' | null {
  const target = actionable(el);
  if (!target) return null;
  const c = classify(target);
  return c.dyn ?? c.name;
}

function readDynamic(el0: Element, dyn: 'switch' | 'check'): SfxName | null {
  let el: Element = el0;
  if (el.tagName === 'LABEL') { const c = (el as HTMLLabelElement).control; if (c) el = c; }
  const on = el.tagName === 'INPUT' ? (el as HTMLInputElement).checked : el.getAttribute('aria-checked') === 'true';
  return dyn === 'switch' ? (on ? 'switchOn' : 'switchOff') : (on ? 'checkOn' : 'checkOff');
}

// ───────────────────────── the engine ─────────────────────────

interface Voice { name: SfxName; prio: number; t0: number; src: AudioBufferSourceNode; gain: GainNode }
interface Pending { id: number; el: Element; pick: Choice; pan: number }

type WindowWithAudio = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext; __SFX_LOG__?: { name: SfxName; t: number; rate: number; played: boolean }[] };

/** A gentle limiter with no delay: linear up to half scale, then a soft knee. Stacked sounds never hard-clip. */
function limiterCurve(): Float32Array<ArrayBuffer> {
  const N = 2048;
  const c = new Float32Array(N * 2 + 1);
  for (let i = 0; i < c.length; i++) {
    const x = (i - N) / N, a = Math.abs(x);
    c[i] = Math.sign(x) * (a <= 0.5 ? a : 0.5 + 0.5 * Math.tanh((a - 0.5) / 0.5));
  }
  return c;
}

/** Runs a function right after the current event has finished, a fraction of a millisecond later. */
const nextTask = (() => {
  if (typeof MessageChannel === 'undefined') return (fn: () => void) => { setTimeout(fn, 0); };
  const ch = new MessageChannel();
  const q: (() => void)[] = [];
  ch.port1.onmessage = () => { for (const f of q.splice(0)) f(); };
  return (fn: () => void) => { q.push(fn); ch.port2.postMessage(0); };
})();

class Sfx {
  /** Master switch (Settings → Sound effects). */
  enabled = true;
  private level: SfxLevel = 'full';
  private volume = 0.8;
  private kit: KitId = 'soft';
  private haptics = true;

  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private kits = new Map<KitId, Map<SfxName, AudioBuffer>>();
  private loading = new Map<KitId, Promise<boolean>>();
  private voices: Voice[] = [];
  private lastAt = new Map<SfxName, number>();
  private lastPress = 0;
  private lastClick = 0;
  private attached = false;
  private gesture = 0;
  private pending: Pending | null = null;
  private explicitFor = -1;
  private listeners = new Set<(name: SfxName) => void>();

  // ── settings ──

  configure(p: { enabled?: boolean; level?: SfxLevel; volume?: number; kit?: KitId; haptics?: boolean }) {
    if (p.enabled !== undefined) this.enabled = p.enabled;
    if (p.level) this.level = p.level;
    if (p.haptics !== undefined) this.haptics = p.haptics;
    if (p.volume !== undefined) { this.volume = Math.min(1, Math.max(0, p.volume)); if (this.out && this.ctx) this.out.gain.setTargetAtTime(this.masterGain(), this.ctx.currentTime, 0.02); }
    if (p.kit && p.kit !== this.kit) { this.kit = p.kit; if (this.attached) void this.load(p.kit); }
  }
  setEnabled(on: boolean) { this.enabled = on; }
  get activeKit() { return this.kit; }
  isLoaded(kit: KitId = this.kit) { return this.kits.has(kit); }
  /** Perceptual volume curve. 0.8 on the slider is the level the kits were balanced for. */
  private masterGain() { return 1.5 * Math.pow(this.volume, 1.5); }

  // ── loading ──

  /** Fetches and decodes a kit. Safe to call again; resolves true when the sounds are ready. */
  load(kit: KitId = this.kit): Promise<boolean> {
    if (this.kits.has(kit)) return Promise.resolve(true);
    const hit = this.loading.get(kit);
    if (hit) return hit;
    const job = (async () => {
      try {
        const [meta, bin] = await Promise.all([
          fetch(`/sfx/${kit}.json`).then((r) => { if (!r.ok) throw new Error('index'); return r.json() as Promise<{ rate: number; sounds: Record<string, [number, number]> }>; }),
          fetch(`/sfx/${kit}.flac`).then((r) => { if (!r.ok) throw new Error('audio'); return r.arrayBuffer(); }),
        ]);
        // Decoding needs no user gesture on an offline context, so the first tap can already be heard.
        const off = new OfflineAudioContext(1, 1, meta.rate);
        const all = await off.decodeAudioData(bin);
        const data = all.getChannelData(0);
        const map = new Map<SfxName, AudioBuffer>();
        for (const [name, [start, dur]] of Object.entries(meta.sounds)) {
          const a = Math.round(start * meta.rate), b = Math.min(data.length, Math.round((start + dur) * meta.rate));
          if (b <= a) continue;
          const buf = off.createBuffer(1, b - a, meta.rate);
          buf.copyToChannel(data.slice(a, b), 0);
          map.set(name as SfxName, buf);
        }
        this.kits.set(kit, map);
        return true;
      } catch {
        this.loading.delete(kit);
        return false;
      }
    })();
    this.loading.set(kit, job);
    return job;
  }

  // ── wiring ──

  /** Starts listening for taps. Call once, early. */
  attach() {
    if (this.attached || typeof document === 'undefined') return;
    this.attached = true;
    const cap = { capture: true } as const;
    const wake = (e: Event) => { if (e.isTrusted) this.unlock(); };
    document.addEventListener('pointerdown', wake, { capture: true, passive: true });
    document.addEventListener('keydown', wake, { capture: true, passive: true });
    document.addEventListener('click', this.onClick, cap);
    document.addEventListener('input', this.onInput, { capture: true, passive: true });
    document.addEventListener('change', this.onChange, { capture: true, passive: true });
    // Tests can read what was played: set window.__SFX_LOG__ = [] before the app starts.
    if ((window as WindowWithAudio).__SFX_LOG__) Object.assign(window, { __sfx: { sfx: this, soundFor } });
    const idle = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => void this.load(), { timeout: 2500 }); else setTimeout(() => void this.load(), 800);
  }

  /** Browsers only allow sound after a tap or key press. This is called from those. */
  unlock() {
    if (!this.ctx) {
      const w = window as WindowWithAudio;
      const AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { try { this.ctx = new AC(); } catch { return; } }
      this.out = this.ctx.createGain();
      this.out.gain.value = this.masterGain();
      const lim = this.ctx.createWaveShaper();
      lim.curve = limiterCurve();
      this.out.connect(lim).connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }

  private onClick = (e: MouseEvent) => {
    if (!e.isTrusted) return;
    this.unlock();
    const el = actionable(e.target);
    if (!el) return;
    const now = performance.now();
    // A label and its input both report the same tap. Nobody taps twice within 35 ms.
    if (now - this.lastClick < 35) return;
    this.lastClick = now;
    const pick = classify(el);
    if (!pick.name && !pick.dyn) return;
    const id = ++this.gesture;
    const pan = e.detail > 0 || e.clientX ? Math.max(-0.22, Math.min(0.22, (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 0.5)) : 0;
    this.pending = { id, el, pick, pan };
    // Run after the app has handled the click, so the app can swap in a better sound and switches can report their new state.
    nextTask(() => this.settle(id));
  };

  private settle(id: number) {
    const p = this.pending;
    if (!p || p.id !== id) return;
    this.pending = null;
    if (this.explicitFor === id) return;
    let name = p.pick.name;
    if (p.pick.dyn) name = p.el.isConnected ? readDynamic(p.el, p.pick.dyn) : (p.pick.dyn === 'switch' ? 'tap' : 'checkOn');
    if (name) this.fire(name, { pan: p.pan });
  }

  private onInput = (e: Event) => {
    const t = e.target as HTMLInputElement | null;
    if (!t || t.tagName !== 'INPUT' || t.type !== 'range' || !e.isTrusted) return;
    const min = Number(t.min) || 0, max = Number(t.max) || 100;
    const p = (Number(t.value) - min) / (max - min || 1);
    this.fire('detent', { semitones: penta(Math.round(p * 9)) - 3 });
  };

  private onChange = (e: Event) => {
    const t = e.target as HTMLSelectElement | null;
    if (t && t.tagName === 'SELECT' && e.isTrusted && !t.closest('[data-sfx="none"]')) this.fire('select');
  };

  // ── playing ──

  /** Plays a sound on purpose. Inside a click this replaces the automatic sound for that click. */
  play(name: SfxName, o: PlayOpts = {}) {
    if (this.pending) this.explicitFor = this.pending.id;
    this.fire(name, o);
  }

  /** For the Sound lab: plays whatever kit is loaded, ignoring level and echo rules. */
  preview(name: SfxName, o: PlayOpts = {}) {
    this.unlock();
    this.fire(name, { ...o, force: true });
  }

  /** Hear about every sound that is played (the visual effects use this). Returns a function that stops listening. */
  listen(fn: (name: SfxName) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }

  /**
   * The feel of a gesture, named the way iOS names its haptics. Android vibration motors only know "how long", so the strength
   * is the length: a tick is a few milliseconds, a thud is a few more. Follows the Vibration setting, and does nothing on
   * devices without a vibration motor. A new haptic replaces one that is still running, so two never pile up.
   */
  haptic(kind: HapticKind) {
    const now = performance.now();
    if (now - this.lastHaptic < 40) return;
    this.lastHaptic = now;
    this.vibrate(HAPTICS[kind]);
  }
  private lastHaptic = 0;

  /** Short vibration on phones that support it. */
  vibrate(pattern: number | number[]) {
    if (!this.haptics || typeof navigator === 'undefined' || !navigator.vibrate) return;
    // Browsers refuse (and log an error) until the person has touched the page once.
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return;
    try { navigator.vibrate(pattern); } catch { /* not allowed right now */ }
  }

  private admit(name: SfxName, def: Def, now: number): boolean {
    const gap = name === 'detent' ? 38 : name === 'step' ? 30 : 45;
    if (now - (this.lastAt.get(name) ?? -1e9) < gap) return false;
    if (def.prio === 1) {
      if (now - this.lastPress < 22) return false;
      // A bigger sound just started and already covers this moment.
      if (this.voices.some((v) => v.prio >= 2 && now - v.t0 < 120)) return false;
    }
    if (def.prio >= 2) {
      for (const v of this.voices) {
        const age = now - v.t0;
        if (v.prio > def.prio && age < 160) return false;
        if (v.prio === def.prio && def.prio < 4 && age < 90) return false;
      }
    }
    return true;
  }

  private fire(name: SfxName, o: PlayOpts = {}): boolean {
    const def = SOUNDS[name];
    if (!def || typeof document === 'undefined' || document.hidden) return false;
    if (!o.force && this.level === 'light' && !def.light) return false;
    const now = performance.now();
    if (!o.force && !this.admit(name, def, now)) return false;
    this.lastAt.set(name, now);
    if (def.prio === 1) this.lastPress = now;
    if (def.buzz && !o.force) this.vibrate(def.buzz);
    if (!o.force) for (const l of this.listeners) l(name);
    if (!this.enabled && !o.force) return false;

    const log = (window as WindowWithAudio).__SFX_LOG__;
    const ctx = this.ctx, out = this.out;
    const kit = this.kits.get(this.kit);
    const buf = kit?.get(name) ?? (STAND_IN[name] ? kit?.get(STAND_IN[name]!) : undefined);
    const rate = (o.semitones ? Math.pow(2, o.semitones / 12) : 1) * (def.vary ? 1 + (Math.random() - 0.5) * 0.05 : 1);
    const entry = { name, t: now, rate, played: false };
    if (log) log.push(entry);
    if (!ctx || !out || !buf || ctx.state !== 'running') return false;

    // A louder sound takes over: fade out quiet ones that are still ringing.
    const t = ctx.currentTime;
    if (def.prio >= 2) for (const v of this.voices) if (v.prio < def.prio && now - v.t0 < 450) this.fade(v, t);
    if (this.voices.length >= 8) {
      const victim = this.voices.reduce((a, b) => (b.prio < a.prio || (b.prio === a.prio && b.t0 < a.t0) ? b : a));
      if (victim.prio >= def.prio && def.prio === 1) return false;
      this.fade(victim, t);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = (o.gain ?? 1) * (def.vary ? Math.pow(10, (Math.random() - 0.5) / 10) : 1);
    src.connect(gain);
    let tail: AudioNode = gain;
    if (o.pan && typeof ctx.createStereoPanner === 'function') {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, o.pan));
      gain.connect(pan);
      tail = pan;
    }
    tail.connect(out);
    const voice: Voice = { name, prio: def.prio, t0: now, src, gain };
    this.voices.push(voice);
    src.onended = () => { this.voices = this.voices.filter((v) => v !== voice); src.disconnect(); gain.disconnect(); if (tail !== gain) tail.disconnect(); };
    src.start();
    entry.played = true;
    return true;
  }

  private fade(v: Voice, at: number) {
    try {
      v.gain.gain.cancelScheduledValues(at);
      v.gain.gain.setValueAtTime(v.gain.gain.value, at);
      v.gain.gain.linearRampToValueAtTime(0, at + 0.03);
      v.src.stop(at + 0.035);
    } catch { /* already finished */ }
  }

  /** What the engine is doing, for the Sound lab and for tests. */
  status() {
    return { state: this.ctx?.state ?? 'idle', kit: this.kit, loaded: [...this.kits.keys()], sounds: this.kits.get(this.kit)?.size ?? 0, sampleRate: this.ctx?.sampleRate ?? 0, baseLatency: this.ctx?.baseLatency ?? 0 };
  }

  // ── older calls, kept so existing code keeps working ──

  /** Taps now get their sound automatically, by role. Nothing to do here. */
  playClick() { /* handled by the tap listener */ }
  playTabTransition(_tab?: string) { /* handled by the tap listener */ void _tab; }
  playCheckTick() { this.play('checkOn'); }
  playCancel() { this.play('undo'); }
  playSuccessReward() { this.play('success'); }
  playLevelUp() { this.play('rank'); }
}

export const sfx = new Sfx();
