#!/usr/bin/env python3
"""
Renders the app's sound kits into one audio sprite per kit (FLAC + a small JSON index).

    python3 tools/sfx/build_sfx.py                # writes public/sfx/soft.*, glass.*, voyage.* and lantern.*
    python3 tools/sfx/build_sfx.py --report /tmp/sfx-report   # also writes WAVs, metrics and spectrograms

Every sound is built from plain physics-style ingredients, so nothing here is a raw beep:
  * modal voices: a handful of damped sine partials, like a struck wooden bar or a glass rim
  * a tiny band-limited "finger contact" transient
  * pitch sweeps and band-passed air for whooshes
  * a synthetic room (decaying noise impulse response) for the longer sounds
All chimes live in C major pentatonic, so any two of them played together still sound pleasant.
Needs numpy and scipy, plus ffmpeg for the FLAC encode. The random seed is fixed, so output is repeatable.
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
GAP = 0.04  # silence between sounds inside a sprite (seconds)


def n(sec):
    return int(round(sec * SR))


def tax(sec):
    return np.arange(n(sec)) / SR


# ───────────────────────────── filters and envelopes ─────────────────────────────
def _sos(kind, fc, order):
    return signal.butter(order, fc, kind, fs=SR, output="sos")


def hp(x, fc, order=2):
    return signal.sosfilt(_sos("highpass", fc, order), x)


def lp(x, fc, order=2):
    return signal.sosfilt(_sos("lowpass", min(fc, SR * 0.46), order), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, min(hi, SR * 0.46)], "bandpass", fs=SR, output="sos"), x)


def raised(att_ms, length):
    """Raised-cosine attack: starts at zero, so there is never a click at the start."""
    a = max(1, n(att_ms / 1000))
    e = np.ones(length)
    k = min(a, length)
    e[:k] = 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
    return e


def add(canvas, sig, at=0.0, gain=1.0):
    i = n(at)
    j = min(len(canvas), i + len(sig))
    if j > i:
        canvas[i:j] += sig[: j - i] * gain
    return canvas


def layer(*parts):
    """Sum signals of different lengths. Each part is an array or (array, at_seconds, gain)."""
    parts = [(p, 0.0, 1.0) if isinstance(p, np.ndarray) else p for p in parts]
    total = max(n(at) + len(s) for s, at, _ in parts)
    c = np.zeros(total)
    for s, at, g in parts:
        add(c, s, at, g)
    return c


# ───────────────────────────── voices ─────────────────────────────
def modal(rng, f, dur, partials, decay, att_ms=0.7, detune=0.0016, bright=1.0):
    """A struck object: sum of damped sine partials. partials = [(ratio, amplitude, decay multiplier), ...]."""
    t = tax(dur)
    y = np.zeros_like(t)
    for idx, (ratio, amp, dm) in enumerate(partials):
        fr = f * ratio
        if fr >= 0.45 * SR:
            continue
        # Real objects lose their high partials first (air and material damping), which keeps bright notes soft.
        d = max(0.004, decay * dm / (1.0 + fr / 4500.0))
        a = amp * (bright ** idx) / (1.0 + (fr / 5500.0) ** 2)
        for dt, aa in ((0.0, 1.0), (detune, 0.5)):  # a second, slightly detuned copy gives a natural shimmer
            ph = rng.uniform(0, 2 * np.pi)
            y += a * aa * np.sin(2 * np.pi * fr * (1 + dt) * t + ph) * np.exp(-t / d)
    return y * raised(att_ms, len(y))


def contact(rng, center=2300, ms=8, decay_ms=2.2):
    """Band-limited noise burst: the sound of a fingertip meeting a surface. Returned at unit peak."""
    w = rng.standard_normal(n(ms / 1000))
    w = bp(w, center * 0.55, center * 1.7, 2)
    w *= np.exp(-np.arange(len(w)) / SR / (decay_ms / 1000))
    return w / (np.max(np.abs(w)) + 1e-9)


def sweep_sine(f0, f1, dur, decay, sweep, harm=(1.0, 0.2), att_ms=1.2, ratios=None):
    """A sine that glides from f0 to f1 over `sweep` seconds (exponential glide), with a few partials.
    `ratios` lets the partials sit off the exact harmonics, which sounds like wood or metal instead of a buzz."""
    t = tax(dur)
    f = f0 * (f1 / f0) ** np.minimum(1.0, t / max(sweep, 1e-3))
    ph = 2 * np.pi * np.cumsum(f) / SR
    ratios = ratios or [k + 1 for k in range(len(harm))]
    y = sum(h * np.sin(r * ph) for r, h in zip(ratios, harm))
    return y * np.exp(-t / decay) * raised(att_ms, len(t))


def thump(f0, f1, dur, decay, sweep, harm=(1.0, 0.6, 0.34, 0.18)):
    """A low knock. The harmonics matter: phone and laptop speakers cannot play the bottom note,
    but they do play the 2nd to 4th harmonics, and the ear still hears the low pitch from them."""
    return sweep_sine(f0, f1, dur, decay, sweep, harm, att_ms=1.6, ratios=(1.0, 2.07, 3.24, 4.5)[: len(harm)])


def whoosh(rng, dur, f0, f1, bw=1.3):
    """Soft band-passed air whose centre frequency glides from f0 to f1. Built with an STFT mask."""
    L = n(dur)
    w = rng.standard_normal(L + 4096)
    f, tt, Z = signal.stft(w, fs=SR, nperseg=1024, noverlap=896)
    p = np.clip((tt - tt[0]) / dur, 0, 1)
    centre = f0 * (f1 / f0) ** p
    ff = np.maximum(f, 1.0)[:, None]
    mask = np.exp(-0.5 * (np.log2(ff / centre[None, :]) / (bw / 2)) ** 2)
    _, y = signal.istft(Z * mask, fs=SR, nperseg=1024, noverlap=896)
    y = y[:L]
    q = np.arange(L) / L
    return y * (np.sin(np.pi * q) ** 1.6) / (np.max(np.abs(y)) + 1e-9)


_IRS = {}


def room(rt60, damp, pre_ms=6.0):
    key = (rt60, damp, pre_ms)
    if key in _IRS:
        return _IRS[key]
    r = np.random.default_rng(99)
    L = n(rt60 * 1.15)
    t = np.arange(L) / SR
    h = r.standard_normal(L) * 10 ** (-3 * t / rt60)  # -60 dB at rt60
    hl = lp(h, damp, 2)
    mixc = np.clip(t / rt60, 0, 1)
    h = h * (1 - mixc) + hl * mixc  # the tail is darker than the start, like a real room
    h = hp(h, 180, 1)
    h *= raised(9.0, len(h))  # a soft onset avoids metallic flutter
    h = np.concatenate([np.zeros(n(pre_ms / 1000)), h])
    h /= np.sqrt(np.sum(h ** 2))
    _IRS[key] = h
    return h


def reverb(x, rt60=0.5, mix=0.15, damp=5200, pre_ms=6.0):
    h = room(rt60, damp, pre_ms)
    wet = signal.fftconvolve(x, h)
    out = np.zeros(max(len(x), len(wet)))
    out[: len(x)] += x * (1 - 0.35 * mix)
    out[: len(wet)] += wet * mix
    return out


def finish(x, peak_db, hp_hz=130, lp_hz=9000, drive=1.15, tail_db=-62, fade_ms=14):
    x = x - np.mean(x)
    x = hp(x, hp_hz, 2)
    x = lp(x, lp_hz, 2)
    pk = np.max(np.abs(x)) + 1e-12
    if drive > 1.0:  # a touch of warmth, not distortion
        x = np.tanh(drive * x / pk) / np.tanh(drive) * pk
    pk = np.max(np.abs(x)) + 1e-12
    idx = np.nonzero(np.abs(x) > pk * 10 ** (tail_db / 20))[0]
    end = (idx[-1] + n(0.012)) if len(idx) else len(x)
    x = x[: min(len(x), end)]
    f = min(len(x), n(fade_ms / 1000))
    x[-f:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(f) / f)
    x[: n(0.0004)] *= np.linspace(0, 1, n(0.0004))
    x *= 10 ** (peak_db / 20) / (np.max(np.abs(x)) + 1e-12)
    return x


_KW = None


def kweight(x):
    """ITU-R BS.1770 K-weighting (48 kHz coefficients): shelf boost plus a 38 Hz high-pass."""
    global _KW
    if _KW is None:
        _KW = [signal.tf2sos([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
               signal.tf2sos([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]
    y = x
    for sos in _KW:
        y = signal.sosfilt(sos, y)
    return y


def loudness(x, win=0.2):
    """Loudest 200 ms of the sound, K-weighted, in dB. Close to how long the ear integrates a short sound."""
    y = kweight(x) ** 2
    w = n(win)
    if len(y) < w:
        y = np.concatenate([y, np.zeros(w - len(y))])
    c = np.concatenate([[0], np.cumsum(y)])
    m = (c[w:] - c[:-w]) / w
    return -0.691 + 10 * np.log10(np.max(m) + 1e-12)


def metrics(x):
    pk = np.max(np.abs(x)) + 1e-12
    env = np.abs(x)
    smooth = np.convolve(env, np.ones(n(0.003)) / n(0.003), mode="same")
    act = smooth > pk * 10 ** (-40 / 20)
    rms = np.sqrt(np.mean(x[act] ** 2)) if act.any() else 0
    last = np.nonzero(act)[0]
    dur40 = (last[-1] / SR) if len(last) else 0
    first30 = np.nonzero(smooth > pk * 10 ** (-30 / 20))[0]
    to90 = np.nonzero(smooth > pk * 0.9)[0]
    attack = ((to90[0] - first30[0]) / SR * 1000) if len(first30) and len(to90) else 0
    seg = x[: n(0.25)] * np.hanning(min(len(x), n(0.25)))
    spec = np.abs(np.fft.rfft(seg, 1 << 16)) ** 2
    fr = np.fft.rfftfreq(1 << 16, 1 / SR)
    tot = spec.sum() + 1e-12
    # attack: 10% to 100% of the peak on a 0.25 ms max-filtered envelope
    from scipy.ndimage import maximum_filter1d
    env2 = maximum_filter1d(np.abs(x), size=max(1, n(0.00025)))
    p10 = np.nonzero(env2 >= pk * 0.1)[0]
    p100 = np.nonzero(env2 >= pk * 0.98)[0]
    att = ((p100[0] - p10[0]) / SR * 1000) if len(p10) and len(p100) else 0
    head = x[: n(0.002)]
    jump = float(np.max(np.abs(np.diff(head))) / pk) if len(head) > 2 else 0
    return dict(
        peak=20 * np.log10(pk), rms=20 * np.log10(rms + 1e-12), dur=len(x) / SR, dur40=dur40, attack=att,
        centroid=float((fr * spec).sum() / tot), hf=float(spec[fr > 6000].sum() / tot), lf=float(spec[fr < 150].sum() / tot),
        mid=float(spec[(fr >= 1500) & (fr <= 5000)].sum() / tot), loud=loudness(x), first=float(abs(x[0]) / pk), last=float(abs(x[-1]) / pk),
        dc=float(abs(np.mean(x)) / pk), jump=jump,
    )


# ───────────────────────────── kits ─────────────────────────────
NOTE = dict(C4=261.63, D4=293.66, E4=329.63, G4=392.0, A4=440.0, C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.0,
            B5=987.77, C6=1046.5, D6=1174.66, E6=1318.51, G6=1567.98, A6=1760.0, B6=1975.53, C7=2093.0, E7=2637.02, G7=3135.96)

KITS = {
    # Warm and round: struck wooden bars, a soft celesta-like bell, a little air.
    "soft": dict(
        tick_partials=[(1, 1.0, 1.0), (3.93, 0.34, 0.36), (9.2, 0.09, 0.14)], tick_f=1.0, tick_decay=1.0, contact=(2100, 0.11),
        note_partials=[(1, 1.0, 1.0), (3.93, 0.30, 0.30), (9.2, 0.06, 0.10)],
        bell_partials=[(1, 1.0, 1.0), (2.0, 0.34, 0.55), (3.0, 0.17, 0.35), (4.07, 0.07, 0.22)],
        bright=0.92, lp=8200, hp=140, rev=1.0, glide=1.0,
    ),
    # Clear and bright: a tapped glass rim and crystal bells, a bigger room.
    "glass": dict(
        tick_partials=[(1, 1.0, 1.0), (2.756, 0.34, 0.5), (5.404, 0.12, 0.25), (8.933, 0.04, 0.12)], tick_f=1.2, tick_decay=0.8, contact=(3300, 0.08),
        note_partials=[(1, 1.0, 1.0), (2.756, 0.38, 0.55), (5.404, 0.16, 0.3), (8.933, 0.05, 0.15)],
        bell_partials=[(1, 1.0, 1.0), (2.756, 0.46, 0.7), (5.404, 0.26, 0.45), (8.933, 0.12, 0.3), (13.3, 0.04, 0.2)],
        bright=0.95, lp=9400, hp=160, rev=1.25, glide=1.0,
    ),
    # Wood and bronze for the Voyage world: knocks on a ship's timber, a plucked tine for notes (a kalimba's tine rings with a second mode
    # near 6.3x), and a small ship's bell for rewards (a bell has a hum below its note and a major-third tierce above it, so it sounds bright, not solemn).
    "voyage": dict(
        tick_partials=[(1, 1.0, 1.0), (2.32, 0.5, 0.55), (4.62, 0.2, 0.3), (7.9, 0.07, 0.15)], tick_f=0.62, tick_decay=1.25, contact=(1500, 0.16),
        note_partials=[(1, 1.0, 1.0), (6.27, 0.2, 0.16), (17.5, 0.04, 0.06)],
        bell_partials=[(0.5, 0.36, 1.1), (1, 1.0, 1.0), (1.25, 0.42, 0.75), (1.5, 0.34, 0.6), (2.02, 0.40, 0.5), (2.5, 0.18, 0.35), (2.97, 0.12, 0.28), (4.15, 0.06, 0.18)],
        bright=0.88, lp=7600, hp=120, rev=1.35, glide=1.0,
    ),
    # Glass and brass for Lanternfell: a tap on a lantern's glass pane (a short, slightly bell-like tink), a soft celesta for notes, and a
    # school handbell for rewards. A handbell's tierce is a MINOR third (1.19x), which is what gives it a quiet, old-stone-hall mood next to the
    # Voyage ship's bell; the room is the biggest of the four kits, like a long corridor.
    "lantern": dict(
        tick_partials=[(1, 1.0, 1.0), (1.19, 0.5, 0.8), (2.0, 0.34, 0.5), (2.66, 0.14, 0.3), (4.2, 0.07, 0.18)], tick_f=0.78, tick_decay=0.9, contact=(2300, 0.11),
        note_partials=[(1, 1.0, 1.0), (3.0, 0.22, 0.4), (6.2, 0.07, 0.18)],
        bell_partials=[(0.5, 0.30, 1.0), (1, 1.0, 1.0), (1.19, 0.55, 0.8), (1.5, 0.36, 0.6), (2.0, 0.42, 0.5), (2.51, 0.2, 0.34), (3.0, 0.12, 0.26), (4.2, 0.06, 0.16)],
        bright=0.9, lp=8400, hp=130, rev=1.55, glide=1.0,
    ),
}


# Target loudness per sound: the loudest 200 ms, K-weighted, in dB. Families sit together:
# presses are quiet, confirmations a little fuller, notices calm, rewards the fullest.
LOUD = dict(
    tap=-24, select=-26, nav=-27, switchOn=-22, switchOff=-25, checkOff=-26, step=-25, detent=-34, undo=-24, delete=-22,
    open=-24, close=-27, blipPop=-26, blipClose=-24, blipDrop=-23, tourBack=-25,
    primary=-19, checkOn=-20, copy=-23, save=-19, toastGood=-19, toastInfo=-22, tourNext=-21, blipOpen=-21, blipHello=-19,
    error=-20, toastWarn=-21, toastBad=-23,
    success=-16, quest=-17, goal=-15, week=-14, badge=-14, rank=-12, freeze=-16, tourDone=-15,
    timerStart=-19, timerPause=-25, timerResume=-24, timerMark=-21, timerDone=-17,
)
PEAK_CAP = -3.0


def render_kit(kit_name, rng):
    global K_NAME
    K_NAME = kit_name
    K = KITS[kit_name]
    out = {}

    def tick(f, decay=0.028, dur=0.16, level=1.0, contact_level=None, bright=None):
        y = modal(rng, min(f * K["tick_f"], 2000.0), dur, K["tick_partials"], decay * K["tick_decay"], att_ms=0.6, bright=bright or K["bright"])
        y = y / (np.max(np.abs(y)) + 1e-9)
        cl = K["contact"][1] if contact_level is None else contact_level
        c = contact(rng, K["contact"][0]) * cl
        o = np.zeros(len(y))
        add(o, y)
        add(o, c)
        return o * level

    def note(f, decay=0.08, dur=0.5, level=1.0, kind="note", att_ms=0.9):
        parts = K["note_partials"] if kind == "note" else K["bell_partials"]
        y = modal(rng, f, dur, parts, decay, att_ms=att_ms, bright=K["bright"])
        return y / (np.max(np.abs(y)) + 1e-9) * level

    def seq(canvas_sec, items, rv=None):
        """items: [(signal, at_seconds, gain)]"""
        c = np.zeros(n(canvas_sec))
        for s, at, g in items:
            add(c, s, at, g)
        if rv:
            c = reverb(c, rt60=rv[0] * K["rev"], mix=rv[1], damp=rv[2] if len(rv) > 2 else 5200)
        return c

    def put(name, sig, rough_peak_db, hp_hz=None, lp_hz=None, drive=1.15):
        """Shapes a sound, then sets its level by loudness (not peak), so every sound in a family feels equally loud."""
        y = finish(sig, rough_peak_db, hp_hz or K["hp"], lp_hz or K["lp"], drive)
        y = y * 10 ** ((LOUD[name] - loudness(y)) / 20)
        pk = 20 * np.log10(np.max(np.abs(y)) + 1e-12)
        if pk > PEAK_CAP:
            y = y * 10 ** ((PEAK_CAP - pk) / 20)
            print(f"   note: {K_NAME}/{name} was limited by {pk - PEAK_CAP:.1f} dB to stay under {PEAK_CAP} dBFS")
        out[name] = y

    # ── everyday taps ──
    put("tap", tick(1100, 0.028, 0.14), -10)
    put("primary", seq(0.4, [(note(NOTE["G5"], 0.07, 0.3), 0, 1.0), (note(NOTE["G6"], 0.06, 0.22), 0.03, 0.5), (contact(rng, K["contact"][0]) * 0.15, 0, 1)], (0.25, 0.06)), -8)
    put("select", tick(1250, 0.022, 0.11, 0.9), -12)
    put("nav", seq(0.3, [(whoosh(rng, 0.09, 500, 2200) * 0.35, 0, 1), (tick(850, 0.03, 0.14, 0.7), 0.055, 1)]), -14)
    put("switchOn", seq(0.22, [(tick(1250, 0.022, 0.13), 0, 1), (tick(1900, 0.02, 0.1, 0.75), 0.022, 1)]), -9)
    put("switchOff", seq(0.22, [(tick(900, 0.026, 0.13, 0.8), 0, 1), (tick(620, 0.03, 0.13, 0.5), 0.02, 1)]), -12)
    put("checkOn", seq(0.5, [(note(NOTE["E6"], 0.07, 0.3), 0, 1.0), (note(NOTE["A6"], 0.085, 0.3), 0.052, 0.85)], (0.28, 0.1)), -8)
    put("checkOff", tick(800, 0.03, 0.12, 0.7), -13)
    put("step", tick(1000, 0.026, 0.12), -11)
    put("detent", tick(1500, 0.011, 0.06, 0.6, contact_level=0.05), -20)
    put("copy", seq(0.2, [(tick(1250, 0.02, 0.1), 0, 1), (tick(1650, 0.02, 0.1, 0.8), 0.045, 1)]), -13)
    # undo: a tick whose pitch falls
    undo = layer((sweep_sine(1150, 720, 0.15, 0.04, 0.045, (1, 0.25)), 0, 0.8), (contact(rng, K["contact"][0]), 0, 0.12))
    put("undo", undo, -11)
    # delete: a soft low thud
    thud = layer(thump(300, 150, 0.3, 0.055, 0.07, (1, 0.85, 0.6, 0.38)), (bp(contact(rng, 700, 12, 5), 320, 1400), 0, 0.5))
    put("delete", thud, -9, hp_hz=90, lp_hz=2600)

    # ── panels ──
    put("open", seq(0.55, [(whoosh(rng, 0.15, 420, 1700) * 0.5, 0, 1), (thump(210, 130, 0.22, 0.05, 0.07) * 0.75, 0.07, 1),
                           (note(NOTE["C6"], 0.12, 0.4, kind="bell"), 0.095, 0.22)], (0.3, 0.1)), -11)
    put("close", seq(0.4, [(whoosh(rng, 0.11, 1600, 420) * 0.4, 0, 1), (thump(180, 120, 0.2, 0.045, 0.06) * 0.55, 0.06, 1)]), -13)

    # ── notices ──
    err = seq(0.7, [(note(NOTE["G4"], 0.09, 0.3), 0, 1.0), (note(NOTE["E4"], 0.11, 0.3), 0.085, 1.0)], (0.25, 0.08))
    put("error", err, -8, lp_hz=2600)
    put("toastGood", seq(0.9, [(note(NOTE["E6"], 0.09, 0.4, kind="bell"), 0, 0.9), (note(NOTE["G6"], 0.11, 0.4, kind="bell"), 0.07, 1.0)], (0.4, 0.16)), -9)
    put("toastInfo", seq(0.8, [(note(NOTE["D6"], 0.12, 0.45, kind="bell"), 0, 1.0)], (0.35, 0.12)), -11)
    put("toastWarn", seq(0.7, [(note(NOTE["A5"], 0.08, 0.3), 0, 1.0), (note(NOTE["E5"], 0.1, 0.3), 0.09, 0.9)], (0.3, 0.1)), -10, lp_hz=4200)
    put("toastBad", seq(0.7, [(note(NOTE["G4"], 0.085, 0.3), 0, 0.8), (note(NOTE["D4"], 0.1, 0.3), 0.09, 0.8)], (0.25, 0.08)), -12, lp_hz=2200)

    # ── rewards ──
    def spark(dur=0.05, level=0.05):
        w = hp(rng.standard_normal(n(dur)), 5500, 2) * np.exp(-np.arange(n(dur)) / SR / (dur / 3))
        return w / (np.max(np.abs(w)) + 1e-9) * level

    put("success", seq(1.6, [(note(NOTE["C6"], 0.1, 0.6, kind="bell"), 0.0, 1.0), (note(NOTE["E6"], 0.11, 0.6, kind="bell"), 0.062, 0.95),
                             (note(NOTE["G6"], 0.14, 0.7, kind="bell"), 0.124, 1.0), (note(NOTE["C7"], 0.2, 0.8, kind="bell"), 0.19, 0.35)], (0.7, 0.22)), -6)
    put("save", seq(1.0, [(note(NOTE["E6"], 0.08, 0.4, kind="bell"), 0.0, 0.9), (note(NOTE["G6"], 0.11, 0.5, kind="bell"), 0.045, 1.0)], (0.45, 0.14)), -8)
    goal_items = [(note(NOTE[k], 0.09, 0.5), i * 0.052, 0.9) for i, k in enumerate(["C5", "E5", "G5", "C6", "E6"])]
    goal_items += [(note(NOTE["G6"], 0.25, 0.9, kind="bell"), 0.26, 0.8), (note(NOTE["C7"], 0.3, 0.9, kind="bell"), 0.265, 0.55)]
    put("goal", seq(2.1, goal_items, (0.9, 0.26)), -5)
    week_items = [(note(NOTE[k], 0.1, 0.55), i * 0.06, 0.9) for i, k in enumerate(["C5", "G5", "C6", "E6", "G6"])]
    week_items += [(note(NOTE["C7"], 0.3, 1.0, kind="bell"), 0.33, 0.9), (note(NOTE["E6"], 0.35, 1.0, kind="bell"), 0.34, 0.6), (note(NOTE["G5"], 0.35, 1.0, kind="bell"), 0.34, 0.5)]
    put("week", seq(2.4, week_items, (1.0, 0.3)), -4)
    put("quest", seq(1.3, [(note(NOTE["E6"], 0.08, 0.5, kind="bell"), 0, 1.0), (note(NOTE["B6"], 0.12, 0.6, kind="bell"), 0.055, 1.0), (spark(0.06, 0.05), 0.09, 1.0)], (0.5, 0.2)), -7)
    badge = [(note(NOTE["C6"], 0.4, 1.2, kind="bell"), 0, 0.9), (note(NOTE["G6"], 0.4, 1.2, kind="bell"), 0.0, 0.7), (note(NOTE["E7"], 0.35, 1.2, kind="bell"), 0.09, 0.55), (spark(0.08, 0.05), 0.1, 1.0)]
    put("badge", seq(2.4, badge, (1.1, 0.3)), -5)
    # rank-up: a short fanfare with a soft low pad underneath
    tpad = tax(1.8)
    pad = (0.35 * np.sin(2 * np.pi * 130.81 * tpad) + np.sin(2 * np.pi * 261.63 * tpad) + 0.7 * np.sin(2 * np.pi * 392.0 * tpad) + 0.3 * np.sin(2 * np.pi * 523.25 * tpad)) * raised(160, len(tpad)) * np.exp(-np.maximum(0, tpad - 0.5) / 0.55)
    rank = [(pad / np.max(np.abs(pad)), 0.0, 0.5), (whoosh(rng, 0.35, 300, 2600) * 0.4, 0.0, 1.0)]
    rank += [(note(NOTE[k], 0.11, 0.7), 0.16 + i * 0.1, 1.0) for i, k in enumerate(["C5", "E5", "G5", "C6"])]
    rank += [(note(NOTE[k], 0.5, 1.5, kind="bell"), 0.62, g) for k, g in (("C5", 0.6), ("G5", 0.6), ("E6", 0.7), ("C7", 0.55))]
    rank += [(spark(0.12, 0.07), 0.64, 1.0)]
    put("rank", seq(3.4, rank, (1.4, 0.32)), -3)
    # streak freeze: a small cluster of high glass bells with a breath of frost, no sustained whistle
    frost = hp(rng.standard_normal(n(0.35)), 6000, 2) * np.exp(-np.arange(n(0.35)) / SR / 0.09)
    frost = frost / (np.max(np.abs(frost)) + 1e-9) * 0.05
    freeze = [(note(NOTE["G6"], 0.28, 1.0, kind="bell"), 0.0, 0.9), (note(NOTE["D6"], 0.30, 1.1, kind="bell"), 0.07, 0.7),
              (note(NOTE["B6"], 0.22, 0.9, kind="bell"), 0.13, 0.55), (note(NOTE["E6"], 0.34, 1.1, kind="bell"), 0.2, 0.5), (frost, 0.01, 1.0)]
    put("freeze", seq(1.9, freeze, (1.0, 0.3)), -7)

    # ── Blip ──
    hello = [(sweep_sine(780, 1000, 0.2, 0.05, 0.05, (1, 0.12)), 0, 0.85), (note(NOTE["G6"], 0.16, 0.45, kind="bell"), 0.075, 0.9), (spark(0.05, 0.03), 0.12, 1.0)]
    put("blipHello", seq(0.9, hello, (0.3, 0.1)), -8)
    put("blipOpen", sweep_sine(480, 880, 0.26, 0.075, 0.09, (1, 0.3)) , -9)
    put("blipClose", sweep_sine(820, 440, 0.22, 0.06, 0.08, (1, 0.25)), -12)
    put("blipPop", sweep_sine(650, 1500, 0.15, 0.035, 0.035, (1, 0.15)), -14)
    put("blipDrop", sweep_sine(300, 190, 0.28, 0.06, 0.1, (1, 0.35)), -10, hp_hz=80)

    # ── tour ──
    put("tourNext", seq(0.3, [(tick(1250, 0.03, 0.14), 0, 1), (tick(1850, 0.03, 0.14, 0.9), 0.04, 1)]), -10)
    put("tourBack", seq(0.3, [(tick(1500, 0.03, 0.14, 0.9), 0, 1), (tick(1000, 0.03, 0.14), 0.04, 1)]), -12)
    done = [(note(NOTE[k], 0.1, 0.6, kind="bell"), i * 0.06, 0.9) for i, k in enumerate(["C6", "E6", "G6", "C7", "E7"])]
    done += [(note(NOTE["G6"], 0.35, 1.2, kind="bell"), 0.3, 0.6), (spark(0.1, 0.05), 0.28, 1.0)]
    put("tourDone", seq(2.0, done, (0.9, 0.28)), -6)

    # ── study timer ── (added after everything above, so the earlier sounds are rendered exactly as before)
    # start: a breath of air, then a rising run that settles on a small bell, like casting off
    put("timerStart", seq(0.9, [(whoosh(rng, 0.14, 500, 1900) * 0.3, 0, 1), (note(NOTE["G5"], 0.09, 0.4), 0.06, 1.0), (note(NOTE["C6"], 0.11, 0.5), 0.13, 0.95),
                                (note(NOTE["G6"], 0.12, 0.6, kind="bell"), 0.19, 0.55)], (0.45, 0.14)), -8)
    # pause and resume are a falling and a rising pair of the same two notes, so they read as opposites
    put("timerPause", seq(0.6, [(note(NOTE["E6"], 0.08, 0.3), 0, 0.9), (note(NOTE["C6"], 0.1, 0.35), 0.075, 0.8)], (0.3, 0.1)), -11)
    put("timerResume", seq(0.6, [(note(NOTE["C6"], 0.08, 0.3), 0, 0.85), (note(NOTE["E6"], 0.1, 0.35), 0.065, 0.9)], (0.3, 0.1)), -10)
    # mark: one unhurried bell, for the rest-your-eyes chime and the milestone messages
    put("timerMark", seq(1.4, [(note(NOTE["D6"], 0.2, 0.9, kind="bell"), 0, 1.0), (note(NOTE["A6"], 0.16, 0.8, kind="bell"), 0.0, 0.3)], (0.6, 0.2)), -9)
    # done: three rising bells over a warm low note, the sound of an entry being written into the log
    put("timerDone", seq(1.6, [(note(NOTE["C6"], 0.1, 0.5, kind="bell"), 0, 0.9), (note(NOTE["E6"], 0.12, 0.6, kind="bell"), 0.075, 0.9),
                               (note(NOTE["G6"], 0.16, 0.8, kind="bell"), 0.15, 1.0), (note(NOTE["C5"], 0.25, 0.9), 0.15, 0.5)], (0.75, 0.22)), -7)
    return out


def encode_sprite(sounds, path_base, rng):
    names = list(sounds.keys())
    gap = np.zeros(n(GAP))
    pieces, index, cursor = [], {}, 0
    for nm in names:
        s = sounds[nm]
        index[nm] = [round(cursor / SR, 4), round(len(s) / SR, 4)]
        pieces += [s, gap]
        cursor += len(s) + len(gap)
    x = np.concatenate(pieces)
    # 16-bit with triangular dither so the quiet tails stay clean
    d = (rng.random(len(x)) - rng.random(len(x))) / 32768.0
    pcm = np.int16(np.clip((x + d) * 32767.0, -32768, 32767))
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "sprite.wav")
        wavfile.write(wav, SR, pcm)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "flac", "-compression_level", "12", path_base + ".flac"], check=True)
    with open(path_base + ".json", "w") as fh:
        json.dump({"rate": SR, "sounds": index}, fh, separators=(",", ":"))
    return index, os.path.getsize(path_base + ".flac")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "public", "sfx"))
    ap.add_argument("--report", default=None, help="folder for WAVs, a metrics table and spectrograms")
    ap.add_argument("--kit", default="all")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    kits = list(KITS) if a.kit == "all" else [a.kit]
    for k in kits:
        rng = np.random.default_rng({"soft": 20261031, "glass": 20261101, "voyage": 20261102, "lantern": 20261109}[k])
        sounds = render_kit(k, rng)
        index, size = encode_sprite(sounds, os.path.join(a.out, k), rng)
        print(f"{k}: {len(sounds)} sounds, {sum(v[1] for v in index.values()):.1f}s of audio, {size/1024:.0f} KB flac")
        if a.report:
            os.makedirs(os.path.join(a.report, k), exist_ok=True)
            rows = []
            for nm, s in sounds.items():
                wavfile.write(os.path.join(a.report, k, nm + ".wav"), SR, np.int16(np.clip(s, -1, 1) * 32767))
                m = metrics(s)
                rows.append((nm, m))
            with open(os.path.join(a.report, k, "metrics.json"), "w") as fh:
                json.dump({nm: m for nm, m in rows}, fh, indent=1)
            print(f"{'name':11s} {'peak':>6s} {'loud':>6s} {'len':>5s} {'-40dB':>6s} {'att ms':>6s} {'centroid':>8s} {'1.5-5k%':>7s} {'>6k%':>5s} {'<150Hz%':>7s} {'jump':>5s}")
            for nm, m in rows:
                print(f"{nm:11s} {m['peak']:6.1f} {m['loud']:6.1f} {m['dur']:5.2f} {m['dur40']:6.2f} {m['attack']:6.1f} {m['centroid']:8.0f} {100*m['mid']:7.1f} {100*m['hf']:5.1f} {100*m['lf']:7.2f} {m['jump']:5.2f}")
                bad = []
                if m['peak'] > -2.5: bad.append('peak too hot')
                if m['first'] > 0.02 or m['last'] > 0.02: bad.append('edge not at zero')
                if m['dc'] > 0.01: bad.append('dc offset')
                if m['jump'] > 0.6: bad.append('hard first 2 ms')
                if bad: print('   !!', nm, ', '.join(bad))


if __name__ == "__main__":
    sys.exit(main())
