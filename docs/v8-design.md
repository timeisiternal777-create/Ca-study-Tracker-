# v8 design notes: a calm wallpaper, matte content, fluid glass

Source of truth for the v8 build. Read this first after any context reset.

## 0. What the user asked for
"The Background panel of whole app looks odd coz because of it the other things etc looks like ai generic slop so background and it's colour and
etc make it good and also the More smoother UI/UX like fluid like IOS latest version so also incorporate it very Properly"

Reading taken: two things, one cause. (1) The background was busy (a starfield, dust and sparkles that showed through every translucent card), and
everything laid over it (colour-wash cards, boxed icons, glow, glass on every surface) inherited that look. So the background and the colour system
under the cards are redone, not just an accent. (2) The motion and the surfaces should behave like the newest iOS and iPadOS: a calm wallpaper,
a flat content layer, a glass control layer that floats above it, springs, an edge-to-edge sidebar, and a slider for how clear the glass is.
Light appearance (a white interface) was not asked for and is not done; see section 9.

## 1. Three layers
| Layer | What is on it | Rule |
|---|---|---|
| Wallpaper | One canvas behind the app (`lib/sky.ts`, `components/layout/Backdrop.tsx`) | calm, painted once, never moves, nothing on it small enough to be mistaken for content |
| Content | Cards, rows, stat tiles, charts, progress bars, banners | matte: a flat tinted fill, a hairline, a lit top edge. No gradient wash, no glow, no glass |
| Controls | Sidebar, top bar and its buttons, segmented controls, section tabs, the phone tab bar, sheets, alerts, toasts | glass, and only these. Glass does not sit on content |

`styles/glass.css` is the whole v8 layer and is imported last (after `ios-overlays.css`), so it wins at equal specificity. Its sections: 1 colour
tokens, 2 the wallpaper's own colours, 3 glass (how clear), 4 content, 5 controls, 6 the light under a finger, 7 motion, 8 reduced motion.

## 2. The wallpaper (`lib/wallpaper.ts`, `lib/wallpaperPaint.ts`, `lib/sky.ts`)
`wallpaper.ts` has no DOM in it, so the tests can run every hour of the day through it. A sky is a vertical gradient (top, mid, bottom), two soft
pools of light (A low on the menu side at 0.08, 1.02; B high on the far side at 0.94, -0.04), a vignette (0.34) and fine grain (0.032, which breaks
up the steps of a dark gradient and is too weak to read as texture). `skyAt(hour, world, brightness, mode)` returns the colours; `colourAt` gives the
colour of any point (the tests use it to sample the wallpaper under a card); `mixSky` blends two skies.

* **Everyday follows the day**, the way a weather app does: Night, First light, Morning, Daylight, Golden hour, Dusk (`SKY_NAMES`), eased between
  keys, so it never jumps (a test measures the rendered colour at several points and requires no more than 1.5 units of change a minute).
  Settings, Look and feel, Wallpaper: **Follows the day** or **Night** (`data-wallpaper="night"`, saved as `wallpaper: 'day' | 'night'`).
* **The Ledger Seas** keep one sky, the sea at night, with its horizon. **Lanternfell** keeps the school at night, with the castle low on the left
  (it sits under the menu, so it is not hidden by cards). Both ignore the hour and the Night switch, and Settings says so.
* Painted once into a canvas; the browser never blends it again on a frame. (This is the lesson of v7's backdrop.) `lib/sky.ts` sets the browser's
  `theme-color` to the sky's top colour, and the page's first paint (`index.html`, boot colour `#060913`) is close to every sky's top colour (a test
  checks the distance), so there is no flash.
* Everything drawn on it is dark. A test samples every hour, every world and every accent and requires the stylesheet's text colours to stay
  legible on a card laid over any part of it: anywhere to the right of the menu, page titles at least 7:1 (AAA) and the sentence under a title at
  least 4.5:1 (AA); at the top of the screen, where page titles actually sit, that sentence at least 6.5:1. The pools were made a little stronger
  after a first pass looked flat, and re-checked.

## 3. Content: matte
`--card-rgb` (per world) at `--card-a` 0.72, so the wallpaper still shows through a little, with a hairline (`--line`) and an inset top edge of
0.5 px white at 7.5 percent. No `::before` glow (`card--glow` is off), no `background-image` on a card (a browser check asserts it).
Stat icons are unboxed symbols set before their label (they were coloured tiles); progress bars are one solid colour; banners and call-outs are a
flat tint. The chart tooltip is a card too. Text on the bare wallpaper (page titles, their sentence) is one step lighter than on a card.

## 4. Controls: glass, and how clear it is
`--glass-k` (0 Clear to 1 Tinted, set on `<html>` from the saved `glass`, default 55) drives every number. `glassLook()` in `wallpaper.ts` holds the
same numbers as the stylesheet and the tests check the two agree.

| Token | Value |
|---|---|
| bar fill alpha `--glass-a` | 0.34 + 0.56 k |
| solid glass `--glass-a-solid` (toasts, alerts) | 0.62 + 0.36 k |
| side panel `--glass-a-panel` | 0.30 + 0.54 k |
| sheet `--sheet-a` | 0.74 + 0.24 k |
| blur `--glass-blur` | 14 + 16 k px (sheets +10) |
| saturate `--glass-sat` | 1.85 - 0.5 k |

* The **sidebar** is edge to edge (iPadOS 27): top to bottom, flush with the screen's edge, a tint and a hairline, **not blurred** (what is behind
  it never moves, so a blur would show nothing a tint does not). Below 1101 px the phone/portrait tab bar is the glass.
* The **top bar** is clear at rest and turns to glass as content scrolls under it (a scroll-driven animation, with the fallback in `Shell.tsx` for
  browsers without it). Its lower edge dissolves: the glass reaches 24 px below the bar and is masked to fade out, so there is no line to cross.
  The small buttons in it (XP pill, help) are tinted pieces of glass with a lit rim but **no blur of their own**; the bar blurs for them.
* The **light under your finger** (`lib/glassTouch.ts`): on press a spot of light is put on the small control and follows the finger (`--gx`, `--gy`,
  `data-lit`); `--gl` is a registered `@property` number, so the light swells in at once and fades out slowly on release. Content buttons do not
  carry it. Pressing glass makes it grow (1.07), pressing content makes it shrink (0.985).
* **Reduced transparency** (`prefers-reduced-transparency`) and the `still` motion level make glass nearly solid and switch every blur off
  (`--glass-filter` and `--sheet-filter` become `none`).

## 5. Motion
* A new screen **fades up out of a slightly smaller size** (opacity, 10 px up, scale 0.988 to 1, 560 ms, `ios-page-in`), with no sideways slide; the
  old one dims 180 ms sooner. It applies whether you changed screen from the menu or the address changed under the app (`data-dir` is only set by
  `navigateTo()`, so the rule works without it). Screens are lazy chunks, so the arrival starts when the chunk has loaded (the skeleton shimmer
  shows meanwhile).
* The cards of a screen arrive **22 ms apart**, eight steps (it was twelve of 40).
* A **sheet on a screen 641 px or wider springs out of the control that opened it** (`popFrom()` in `lib/ui.ts` records the last press; `Modal.tsx`
  puts `--from-x`, `--from-y` on the sheet); on a phone it is still a bottom sheet. Dragging it away, the flick and the spring back are unchanged
  (`hooks/useSheetDrag.ts`).
* **The ambient loops that decorated cards are gone in the iOS interface**: the floating dial, the halo behind the main button, the glint
  across cards and the twinkling XP icon. (The Classic interface keeps them. Blip, the flame, the rings and the radar's sweep still move; section 6
  explains why that matters under glass.)
* Only transform and opacity animate. The wallpaper never repaints.

## 6. What glass costs, and the rules that came out of measuring it
Blur is the expensive part of glass: the browser has to read what is behind the element and filter it on every frame in which that changes. The test
browser here draws in software, so the cost shows up as dropped frames; a tablet's graphics chip is far faster, but it is the same work, and the Moto
Pad's display runs at 144 Hz, so each frame has under 7 ms. The measurements found three real problems, all fixed:

1. **A blur laid over a blur.** The small top-bar buttons and the logbook's sticky month headings each had a `backdrop-filter` of their own, on
   top of the bar's, and the sticky headings were masked as well. That is the most expensive arrangement glass can make: the browser has to filter
   what is already filtered. The bar is now the only blur in the bar (a browser check asserts exactly one) and the month heading is a tint that fades
   out below it. After that, scrolling under the bar in v8 is level with v7 on the same pages (numbers below). The measurements are noisy (the same
   v7 build scored 1 to 4 slow frames on one run and about 22 on another), so only repeated side-by-side runs mean anything.
2. **A sheet blurs only when it is at rest.** Nobody can see a blur on something that is moving, and a moving blur is the worst case. A sheet has no
   blur and a heavier tint (`--sheet-hush`) while it comes in, goes out, or is dragged; the entrance and exit keyframes say `backdrop-filter: none`
   for their whole length, and `.is-dragging` and `[data-closing]` do the same. When it lands, the blur comes on and the tint eases down to its
   resting value (`ios-sheet-settle`, 360 ms), which looks like the glass clearing. Alerts and toasts are small and keep their blur.
3. **The page behind an open sheet stands still.** The dashboard has about thirty loops (the mascot, the radar, the flame, the rings). Each one made
   the browser redo the sheet's blur on every frame, so an open sheet ran at about 30 frames a second. `holdPage()` in `lib/ui.ts` (called by
   `Modal.tsx`, nested-safe) pauses every animation that repeats for ever and is not part of an overlay, including loops that start while the
   sheet is open (it listens for `animationstart`); they pick up where they stopped when the last overlay closes. It also sets `data-sheet` on
   `<html>`, and the countdown's rolling digits (`features/dashboard/Countdown.tsx`) skip their roll while it is set. An open sheet now draws only
   when something in it changes.

**Rules for adding glass:** one blur layer in any place on the screen; never a blur inside another blurred element; a blur on something that moves
is a decision to be argued, not a default; anything with a loop behind a blur has to be paused while the blur is on screen.

**Numbers** (software-rendered Chromium at 1472 by 920, so a harsh proxy; "slow" is a frame over 25 ms):
* Idle frame rate (`scripts/fps.mjs`): every screen of all three worlds at 55 to 60 frames a second at full, calm and still.
* Scrolling under the glass bar, v7 and v8 side by side on the same pages (Overview, Study log, Insights, Settings), three runs each: 11 to 30 slow
  frames in 81 for v7 and 14 to 34 for v8, the same band. The bar's blur is the whole difference between that and none: without it every run was
  at 0, and a trace shows the software compositor's draw time per frame fall from about 21 ms to 14 ms. So it is the cost of the effect itself,
  in a renderer with no graphics chip, not something v8 added.
* An open sheet at rest: v8 before the fix 34 slow frames in 39 (about 30 fps), v7 13 in 72, v8 now 1 to 2 in 87.
* A sheet springing open: v7 15 slow, v8 8 to 13. Changing screen has a one-off hitch of 100 to 170 ms in both (the lazy chunk, the render and
  the view-transition snapshots, which are expensive in software).
* Not measured: a real tablet at 144 Hz.

## 7. Settings and storage
Settings, Look and feel gains **Glass** (a slider, Clear to Tinted, live, saved a moment after you stop, with Back to the usual) and **Wallpaper**
(Follows the day or Night; for the story worlds it explains that they keep their own). `UserSettings` gains `glass?: number` and
`wallpaper?: 'day' | 'night'`; `loadSettings` validates both. `lib/look.ts` applies them (`applyGlass`, `applyWallpaperMode`); `world/index.ts` does
so before the first paint. `APP_VERSION` is 8.0.0. No new storage keys. The Classic interface keeps its own look but shares the wallpaper and the
matte cards, and has no Glass slider.

## 8. Tests
* `scripts/test.mjs`, "Wallpaper, text colours and glass": 15 checks on the colour engine (every hour, world and accent keeps text legible; the sky
  never jumps; nothing on the wallpaper is bright; Night pins Everyday; the stylesheet's copy of the wallpaper matches the painter's; the boot
  colour matches; the glass numbers in the stylesheet match `glassLook()`). 206 logic checks in all.
* `scripts/e2e-ios.mjs`, "Wallpaper, glass and motion": the wallpaper canvas and the theme colour, the edge-to-edge sidebar, matte cards, unboxed
  stat icons, no ambient loops, the top bar's scroll edge, one blur in the bar, glass buttons, the finger light three times, page arrival by menu and by
  address, the 22 ms stagger, the sheet's pop-in direction and settle, blur only at rest, the page behind a sheet standing still and starting
  again, the Glass slider (live, saved, tinted against clear, after a reload, Back to the usual), Night and Follows the day, the Ledger Seas'
  own wallpaper, and the classic interface. The layout scan (every screen, three worlds, both interfaces, three widths) and the console are
  clean. 102 browser checks in all (`node scripts/e2e-ios.mjs --full`, about five minutes).
* `scripts/fps.mjs` measures idle frame rate only. The scroll and sheet measurements in section 6 were one-off scripts (a frame-time probe run
  against v7 and v8), not kept in the repo.

## 9. What is deliberately not done
* **A Light appearance.** The look is dark only, as before. A white interface is a real piece of work, not a switch: the stylesheets hold about
  190 translucent-white fills (`rgb(255 255 255 / x)`) and 334 hex colours, and the components another 2,267 hex colours, which all assume a dark
  ground. Done properly it is a token pass over every screen, the charts and the PDF reports. It would be the natural next step.
* **Progressive blur.** iOS 26's scroll edge uses a variable blur. A browser can only blur uniformly, so the top bar's edge is a blur masked to fade
  out, which is the closest it gets.
* **The Classic interface** (v5) is untouched apart from the shared wallpaper and cards.

## 10. If you pick this up
* Change a colour of the wallpaper in `lib/wallpaper.ts`, then run `node scripts/test.mjs`: it fails if text stops being legible anywhere on it.
* Change a glass number in `styles/glass.css` section 3 **and** in `glassLook()`, or the test that compares them fails.
* New overlay that blurs: give it `backdrop-filter: none` for the length of its moves, and call `holdPage()` while it is open.
* The classic interface has its own rules in `ui.css`, `layout.css` and so on; everything that is v8-only is under `html[data-ui='ios']` or
  `html[data-ui]` in `glass.css`.
