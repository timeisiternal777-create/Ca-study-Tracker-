// The light under your finger.
//
// iOS glass answers a touch with a bright spot that stays under the fingertip and follows it. Here the spot is a gradient on the control's own
// background (styles/glass.css, section 6) centred on two custom properties, --gx and --gy, and brought up by --gl, a number the browser can ease.
// This file only says where the finger is: on press it puts the position on the control and sets data-lit, while the finger moves it follows, and on
// release it clears data-lit (the stylesheet fades the light out; the last position is kept so it fades where it was).

/** The small controls that carry the light. Content buttons (the coloured capsules) do not: their own fill would fight it. */
const LIT = '.icon-btn, .xp-pill, .nav-item, .bn-item, .sect-tab, .seg > button, .stepper-btn, .tpill button, .modal-close';

let held: HTMLElement | null = null;

function place(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--gx', `${Math.round(x - r.left)}px`);
  el.style.setProperty('--gy', `${Math.round(y - r.top)}px`);
}

function release() {
  if (!held) return;
  held.removeAttribute('data-lit');
  held = null;
}

/** Start following presses. Call once, after the interface has been chosen (it does nothing in the classic interface; the stylesheet ignores it there). */
export function installGlassTouch() {
  if (typeof document === 'undefined') return;
  document.addEventListener('pointerdown', (e) => {
    release();
    const target = e.target instanceof Element ? e.target : null;
    const el = target?.closest<HTMLElement>(LIT);
    if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
    held = el;
    place(el, e.clientX, e.clientY);
    el.setAttribute('data-lit', '');
  }, { passive: true, capture: true });
  document.addEventListener('pointermove', (e) => { if (held) place(held, e.clientX, e.clientY); }, { passive: true });
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, release, { passive: true, capture: true });
  window.addEventListener('blur', release);
}
