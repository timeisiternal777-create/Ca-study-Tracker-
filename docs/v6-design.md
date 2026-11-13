# v6 design notes: the iOS-style interface

Source of truth for the v6 build. Read this first after any context reset.

## 0. What the user asked for
"Absolute smooth new iOS-like UI/UX in all aspects. Add it, install what you need." The package registry is blocked where this was built,
so there are no new dependencies: the motion, gestures and materials are small pieces of hand-written code (about 600 lines of TypeScript,
about 700 lines of CSS).

## 1. One switch: `<html data-ui="ios | classic">`
* `ios` is the default. `classic` is the look the app had in v5, kept whole as a fallback (Settings, Look and feel, **Interface**).
* The setting is `settings.ui` (types.ts), sanitised on load (StudyContext), written to `<html>` by `index.html` before the first paint
  and again by `bootUi()` (lib/ui.ts), so the right look is there from the first frame. `useIos()` / `isIos()` read the attribute.
* Everything iOS-specific in CSS is scoped under `html[data-ui='ios']` (styles/ios.css, styles/ios-overlays.css). Nothing in `classic`
  changed. Classic dialogs, confirms, ripples and the plain top bar are all still there.
* The Voyage world keeps its own colours and fonts: `:root[data-world='voyage']` (0,2,0) outranks `html[data-ui='ios']` (0,1,1) for tokens;
  where a rule has to differ it is written as `html[data-ui='ios'][data-world='voyage']`.

## 2. Springs (lib/spring.ts)
* A spring is `{ response, damping }` like SwiftUI. The motion is solved exactly (`springAt`), not simulated frame by frame.
* Four named springs: **smooth** (0.44 s, no overshoot: sheets and big moves), **snappy** (0.34 s, damping 0.82: switches and sliding
  highlights), **bouncy** (0.46 s, 0.62: toasts and pops), **press** (0.30 s, 0.70: a control springing back after being pressed).
* `springCurve()` samples a spring into a CSS `linear()` easing plus the duration it takes to settle. `node tools/ios/springs.mjs` prints
  the tokens (`--ios-spring-<name>` and `-d`, 44 samples each, `TOKEN_POINTS`) that are pasted into ios.css. A test fails if the stylesheet
  drifts from the code.
* In gestures the same maths runs in `requestAnimationFrame` with an **initial velocity**: let go of a sheet at a given finger speed and the
  spring starts at that speed instead of from rest. That one detail is most of what makes it feel like iOS rather than like an animation.
* `rubber(over, dim)` is UIScrollView's rubber-band formula. `Velocity` reads the finger speed over the last ~100 ms.

## 3. Materials
* **Glass** (`--glass-bg`, `--glass-filter: blur(28px) saturate(1.75)`, `--glass-rim` highlights) is used on a few surfaces only:
  the top bar (clear at rest), the phone tab bar, toasts and alerts. The sidebar is a translucent panel (`--panel-bg`) with **no** blur:
  blur over the constantly redrawn sky cost about 20 frames a second there (section 10). Blur is the most expensive thing the app does,
  so it is never put on something that scrolls under many items. Turned off by `prefers-reduced-transparency` and by Animation: Still.
* **Squircle corners** (`corner-shape: squircle`, Chrome 139 and newer) on sheets, alerts, toasts, fields, buttons and the navigation;
  older browsers show ordinary round corners. Big cards, wallpaper cards and skeletons keep plain round corners: the mask is redrawn on
  every frame that a card moves, which cost about 5 frames a second on a busy screen (section 10).
* **Type**: Inter Display for large titles (34 px, tight tracking), Inter for text. Voyage keeps Almendra and IM Fell English.
* **Controls**: 51 by 31 switch with a stretching thumb, capsule segmented control whose thumb slides on a spring, capsule buttons, flat
  accent primary, 28 px slider thumb, inset fields.
* **Press feel**: every pressable thing scales down on a `press` spring on touch (`--press`), and springs back on release. The v5 ripple
  is not created in this look (lib/fx.ts).

## 4. Navigation
* Wide screens: a floating glass sidebar with a sliding selection capsule. Phones and portrait tablets: a floating glass tab bar with a
  capsule that glides between items. Icons are outlines that fill in when their screen is the current one (config/nav.ts `sectionIcon`).
* **Large titles.** Every screen has a 34 px title (PageHeader). The top bar is clear at rest; as the page scrolls under it, the glass
  fades in over the first 30 px and the small centred title fades in between 26 and 70 px. Done with CSS scroll-driven animations
  (`animation-timeline: scroll(root block)`, Chrome 115 and newer, `@supports`-guarded), so it runs off the main thread. A page too short
  to scroll has no scroll timeline, and Chrome keeps whatever the glass last showed (a long page scrolled, then a short page opened); the
  shell therefore sets `data-fit` on the top bar while the document cannot scroll (`useBarState` in Shell.tsx) and CSS clears the glass.
  The same hook sets `data-scrolled` once the page is past 30 px (it lets go below 12 px), and CSS holds the sparkle inside the bar
  still while it is glass (section 10).
  Reduced motion sets every animation to 0.001 ms, which would stop this one, so these two carry `animation-duration: auto !important`
  (it is the scroll position, not a movement).
* The running-timer pill is a black capsule in the top bar (the "island").

## 5. Gestures
* **Sheets** (components/ui/Modal.tsx + hooks/useSheetDrag.ts). Every dialog is a sheet that rises from the bottom (a bottom sheet on
  phones, a centred sheet on wide screens). Drag the grabber, the header, the footer, or the body when its content fits; a tall sheet keeps
  its body for scrolling. Text fields and sliders never start a drag. The sheet follows the finger one to one, stretches with resistance
  when pulled up, goes away at the finger's speed on a flick (or past a third of its height), springs back from the finger's speed when let
  go slowly, and can be caught again mid-spring. The dimmed backdrop is its own layer, driven by `--scrim-o`, so the sheet stays fully
  opaque. Running CSS animations are **cancelled** at the start of a drag (turning them off in CSS would restart them later).
* **Alerts** (`IosAlert` in Modal.tsx). `useConfirm()` shows a small glass card with its buttons in a row under hairlines (stacked when the
  labels are long), the confirming button focused. In Classic it is the old dialog. Callers did not change.
* **Switches** (`Switch` in ui/Controls.tsx). The thumb can be dragged: it follows the finger, ticks (a haptic) when it crosses the middle,
  the track takes the colour of the nearer side, and it settles on that side. The pressed thumb is wider, so it travels less (`--tw`, `--f`).
  The click that ends a drag is swallowed so it cannot flip the switch a second time.
* **Toasts** (hooks/useSwipeAway.ts). A toast follows the finger sideways or down, fades a little, flies off on a flick or a long pull,
  springs back otherwise, and stays on screen while a finger is on it.

## 6. Haptics
`sfx.haptic('select' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error')` (lib/sfx.ts). Android has no vibration
*strength*, only duration, so strength is length: a tick is 6 ms, a thud 24 ms, a success three taps. Follows the Vibration setting, does
nothing without a motor, drops a second haptic within 40 ms. The sound events that already had a buzz keep it.

## 7. Hard rules
* Motion is `transform` and `opacity`. Glass layers are not animated except for opacity.
* No new runtime dependency. `react`, `react-dom`, `react-icons` only.
* Classic must stay intact: any iOS rule is under `html[data-ui='ios']`, any new element has a classic default (`display: none`).
* Gestures never fight scrolling: `touch-action` is set per zone, and a drag that starts sideways or upwards is handed back to the page.
* Every gesture has a mouse and keyboard equivalent (Esc closes sheets and alerts, switches are buttons).

## 8. Checks
* `npm test`: 169 logic checks (12 are new in v6: the spring maths, the rubber band, finger speed, the interface switch, menu icons, haptics, and that
  the CSS spring tokens match the code).
* `npm run e2e:ios`: 41 browser checks with real mouse input (sheet drag, flick and spring back, alerts, switch drag, toast swipe, the glass top
  bar in all its states including reduced motion and the held sparkle, the Classic fallback, and a layout scan for sideways scrolling and console
  errors in both worlds and both interfaces at desktop, tablet and phone widths). `--full` scans every screen.
* `npm run fps`: frame rate sampler (the blur layers are included).

## 9. What cannot be checked here
Feel. There is no finger, no GPU and no vibration motor in the build sandbox. Timing, geometry, states and console output are checked;
whether it feels right under a thumb is for the Moto Pad.

## 10. Performance decisions (measured in a software-rendered 60 Hz Chromium, which is a harsh proxy)
Measured with `scripts/fps.mjs` (idle) and a script that scrolls the page 14 px a frame. What was found, and what was done about it:
* **Backdrop blur costs most where the picture behind it keeps changing.** The sky is one canvas redrawn 20 times a second; a blurred,
  full-height sidebar over it cost about 20 fps on its own, and with squircle cards as well the screens held 29 to 43 fps. The sidebar is
  now a plain translucent panel and the cards are round again (58 to 60).
* **`corner-shape: squircle` on a card that moves** redraws the mask on every frame (about 5 fps lost on a busy screen). Cards keep round
  corners; the squircle stays on things that do not animate.
* **Anything that loops inside the glass top bar redraws the blur every frame.** The only loop there is the XP sparkle; it holds still while the
  page is scrolled (`data-scrolled`). With that, scrolled-and-idle goes from 50 to 60 fps on the log screen.
* **Tried and dropped: slowing the sky while scrolled.** Halving its redraw rate (20 to 10 a second) changed nothing measurable, because the cost
  was the loop in the bar, not the sky. It was removed again.
* **Left as it is:** a gleam sweeping across a card that sits right under the glass bar can take a screen to about 54 fps in this browser while it
  sweeps (a few seconds in every fifteen). On a GPU this is a small blur of a thin strip.
* While scrolling, the frosted bar costs about 2 fps in this browser (58 against 60 with the blur off); the page itself is moved by the compositor.
