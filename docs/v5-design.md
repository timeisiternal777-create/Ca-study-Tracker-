# v5 design notes: timer, living motion, Ledger Seas world

Source of truth for the v5 build. Read this first after any context reset. Progress is tracked at the bottom.

## 0. What the user asked for (v5)
1. Build the optional "journey" theme (Foundation -> Final -> treasure). Not default. Chosen in Settings, applied after selecting.
   Characters must be original (no One Piece characters, names, logos or music). Great logic, SVG art, sound, animation, visuals.
2. "Very little animation, bleep and gone". Wants continuous, motivating, continuous-looking motion everywhere, smooth at 60+ fps.
3. A study **timer**: start on opening the app, choose a subject, stop -> automatically added to the log. Very careful logic:
   the same subject can be timed 2-3 times a day (must merge, not duplicate).
4. "Think a lot first, build systematically, final best output."

## 1. Hard rules for motion (performance)
- Animate only `transform` and `opacity`. Never animate box-shadow, filter, background-position, width/height, or SVG path data.
- Ambient loops live in their own composited layers (position fixed/absolute + will-change: transform/opacity) that hold *static* content.
- At most ~1.3 viewports of animated layer area at once. Small loops (flame, shimmer, breathing) are cheap and everywhere.
- Large SVG scenes are split into several SVG/DOM layers; the *wrapper* moves, not the children. Only small SVGs (<=240px: crew, icons) animate children.
- `html[data-motion]` = `full | calm | still`, set by the governor (lib/motion.ts) and the Settings "Animation" choice.
  `full`: everything. `calm`: no big ambient layers/particles/parallax, small loops stay. `still`: no infinite animations (one-shot feedback only).
  `prefers-reduced-motion` and the old `reduceMotion` setting force `still`.
- Pause everything when the tab is hidden (`html[data-hidden=true] * { animation-play-state: paused }`).
- Governor: rAF sampling bursts (1.2 s every ~20 s while visible, plus 2 s at start). Step down after 2 bad windows, step up after 3 good ones. Never runs a permanent rAF loop.
- Test harness is a software-rendered 60 Hz Chromium: a pessimistic proxy. Target >= 55 fps median idle on every screen in `full`.

## 2. Timer (lib/timer.ts, context/TimerContext.tsx, features/timer/*)
State (localStorage `ca_timer_v1`, not per level): status idle|running|paused, level, subject, topic, startedAt, segments[{from,to}], runStartedAt, seen.
Elapsed is always derived from timestamps (Date.now), never from ticking, so it survives reloads, sleep and background throttling.
Rules:
- Pause/resume create run segments. Paused time never counts.
- Stop: split segments at local midnights -> minutes per date (largest remainder, total = round(totalMs/60000)). < 30 s: discard with a note.
- Merge into that date's log: same subject (trim, case-insensitive) -> add to that slot, merge topic ("; ", de-duplicated, max 140);
  else first free slot; else (all slots used) ask which subject to add to... never needed with 6 slots (see below), still handled: add to the largest.
- Log slots extended from 3 to 6 (`subject4..6`, `topic4..6`, `hours4..6`, `targetHours4..6`, all optional). One helper (lib/log.ts SLOTS) used everywhere.
- Day cap 24 h, slot cap 24 h (UI cap 16 for manual edits). Overflow minutes are trimmed and reported.
- Hours stored as minutes/60 rounded to 4 decimals. Merge by adding hours then rounding to 4 decimals.
- Undo = subtract those minutes from that slot (robust to edits made in between); empty slot is cleared. Done through `mutateStudyLog(date, fn)` (atomic read-modify-write on the latest logs).
- Session history `ca_timer_sessions_v1_<level>` (last 300): id, subject, topic, startedAt, endedAt, ms, minutes, parts[{date,minutes}].
- Recovery: heartbeat `seen` every 15 s while visible. On open: if running and now - seen > 10 min -> dialog (keep going / stop and save all /
  stop and save until last seen / discard). Any single session > 6 h asks for confirmation. Clock moved backwards -> elapsed clamped at 0.
- Level: timer remembers its level. If the current level differs at stop, write straight to that level's storage.
- Extras: Wake Lock (screen on) option, document title shows time, milestone captions (10/25/45/60/90/120 min), optional interval chime (off by default).

## 3. Living UI (default world)
Motion language: *ambient* (slow, low amplitude, looping), *attention* (CTA breathing, claimable glow), *reward* (one-shot, already exists), *continuity* (shared timing, direction-aware route slide, numbers roll).
List: drifting light orbs (3 layers), twinkle (2 star layers cross-fading), rare shooting star, brand-mark sheen, nav glow breathing, XP pill sheen, CTA sheen+breath,
radar sweep+pings, hero dial float, flowing progress stripes, ring comet, flame flicker + embers, claimable quest glow, heatmap today pulse, Blip idle variety,
count-up everywhere, bar growth on view (IntersectionObserver), route slide transition by direction, timer ring/digit roll.
Setting `motionLevel`: auto | full | calm. Existing `reduceMotion` = still.

## 4. Theme engine (src/world/*)
`settings.worldTheme: 'default' | 'voyage'`, `settings.plainWords`, voyage state in `ca_voyage_v1` {cleared:{foundation,inter,final}, captain:{...}, shipName, finaleSeen}.
`<html data-world="voyage">` switches CSS tokens + skin (CSS scoped under `[data-world='voyage']`, bundled with the app CSS), lazy-loads the voyage JS chunk
(art, chart, finale), swaps sound kit default (user can still pick), VFX palette, PDF look default, wording (unless plainWords).
Voyage-only nav entry: "Sea chart" (TabType VOYAGE). Settings -> Look: "World" picker with live preview card, Animation level, Plain words.

## 5. Ledger Seas (original world)
Premise: accounting is nautical. You captain **The Double Entry**, a two-masted brigantine (left sail = Group I, right sail = Group II; patchwork sail: one patch per paper appears as you progress).
Treasure at the end: **the Golden Ledger** (a perfectly balanced book). Ranks keep the app's accounting puns, re-titled as crew ranks.
Journey: three seas in a row: Foundation -> Intermediate -> Final -> treasure on the horizon. You mark each level cleared yourself. Ship evolves per level: sloop (Foundation), brigantine (Inter), galleon (Final).
Sea view of the current level = archipelago: one island per paper (accent colour = subject accent), lanterns on the shore = chapters ticked in the syllabus plan (or hours fraction when no syllabus),
fog = unexplored share; neglected islands (no study 10+ days) fog over again (revision nudge). Ship docks at the island you studied last; sails there when you log or time.
Mocks = storms: score decides how you come through (clear / rough / damage). Pace = tailwind or headwind against the exam date using the existing pace engine. Ghost ship = your best week.
Ending: you press "I cleared CA Final" -> finale (dawn, chest opens, coins, music) -> Voyage Log PDF. A "Watch the ending" preview exists in Settings.

### Art direction
- Storybook night-sea: deep teal abyss, warm lantern gold, sea-foam, coral accents, parchment panels for objects (log pages, scrolls). Moon key light upper-left, warm bounce near lanterns, shadows shift blue-violet, never black.
- Shapes: chunky, slightly asymmetric, tapered. Ink outline (#171c27, 1.6-2 px at 100 px) on characters/ship only; scenery has no outline.
- Type: Almendra Bold for titles (OFL), IM Fell English Italic for log/lore text, Inter for UI, Inter Display for numbers. Fonts subset to WOFF.
- Icons: custom nautical set (anchor, compass, helm, spyglass, scroll, chest, coin, flag, lantern, sail, chart, wave, shell, key), duotone, 24 px grid.
- Texture: tiny paper-grain tile (PNG, generated), used only on parchment panels.

### Crew (all original; bust portraits + small deck figures)
- **Sol**: the captain (you, renamed to your name). Customisable: skin x6, hair style x4, hair colour x7, coat colour x6, accessory x4. Brass compass on a chain.
- **Odalys Quill**: navigator. Silver-streaked curls in a bun with a quill, half-moon glasses, astrolabe. Dry wit. Plan, pace, schedule voice.
- **Tally Fenn**: quartermaster. Small, round, green eyeshade, sleeve garters, ledger bigger than their torso. Numbers, XP, rewards, mock results.
- **Brine Hollis**: shipwright. Broad, rolled sleeves, goggles pushed up, salt-white beard streak, mallet. Revision queue ("hull repairs"), weak papers.
- **Saffron Pell**: cook. Sail-cloth headscarf, ladle, teapot. Breaks, food, sleep, streak freeze ("rations").
- **Blip**: lookout (existing mascot, sailor cap + spyglass). Tips, reminders, tour.
Expressions (face parts swap): neutral, smile, grin, cheer, determined, worry, surprise, sleepy, proud, think.
Idle motion: blink, breathe, head tilt, hair/cloth sway, gaze drift. Reactions on events.

### Sound (Voyage kit) and music
Same 36 roles + new roles (timerStart, timerPause, timerResume, timerMark, timerDone, storm, treasure). Materials: wood block, ship's bell (inharmonic), coin, brass, rope creak, cloth flap, water drop, chest thunk.
New roles are appended to soft and glass too (appending keeps the earlier sounds byte-identical; verified by decoding). Sea ambience is synthesised live in Web Audio (no asset). Short original stingers (rank, storm cleared, treasure ~12 s) rendered offline.

## 6. Reports
PDF "Captain's log" look (parchment, compass rose, wax-seal tiles) as a 4th report theme; Voyage Log PDF (whole journey) from the finale.

## 7. QA plan
tests (timer logic ~30 checks, slot helpers, voyage progress), typecheck (/home/claude/sandbox/check.sh), build, snap every screen x both worlds x 4 viewports, overflow + console error scan,
frame-time sampling per screen (idle) in `full`, reduced-motion check, sound coverage test (every role in every kit), README, zip, clean-room test+build, send.

## 8. Progress
- [x] recon + this doc
- [x] 6-slot log + mutateStudyLog
- [x] timer logic + tests (127 checks)
- [x] timer UI: dashboard card, top-bar clock (a floating pill hid behind Blip, so it lives in the top bar), focus mode, Settings, recovery prompts, session list + undo
- [x] governor + motion CSS + living UI pass (lib/motion.ts, lib/sky.ts, styles/ambient.css; Animation: Auto / Full / Calm)
- [x] theme engine + settings (World picker, Plain words, `data-world`, kit switch with "go back" memory)
- [x] voyage skin (tokens, fonts, scoped CSS in world/skin.css)
- [x] crew art + dialogs (six SVG characters, expressions, idle motion; lines are rules over real data)
- [x] sea chart + islands + ship (layered, GPU-friendly; lanterns, fog, weather, wind, ghost ship, dashboard sea card, backdrop waves)
- [x] storms (weather), ranks (nautical names everywhere, incl. PDF + celebrations), finale, Voyage Log PDF
- [x] voyage sound kit + real recordings for the five timer roles in every kit (sound coverage test)
- [x] QA: typecheck, 157 checks, build, both worlds x 3 viewports (overflow + console), fps in a software 60 Hz browser (58-60), ending viewed on tablet and phone
- [x] README, package

### Left out on purpose (named honestly in the README)
- Sea ambience loop and composed music (cannot be judged without hearing; a looping sound is also easy to find tiresome while studying).
- "Captain's log" as a fourth report theme (the Voyage Log PDF covers the journey; the standard reports only take the rank name from the world).
- Blip with sailor cap and spyglass; custom nautical icon set; paper-grain texture.
