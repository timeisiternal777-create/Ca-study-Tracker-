# CA Study Tracker (v7)

A study tracker for CA Foundation, Intermediate and Final students. It keeps a daily study log, streaks and XP, mock test scores, a syllabus schedule, a marks target sheet and PDF reports, and it comes with **Blip**, a small helper who shows you around and tells you what to do next. It is a local-first PWA: everything is stored in the browser, there is no account and no server.

This is a rebuild of the AI Studio export `87b663fc-ca-inter-2026-study-tracker`. It keeps every feature of the original and changes how it looks, feels and works.

**v7 adds a third story world, Lanternfell Academy, and redraws the old pictures in far more detail.** Lanternfell turns your study into a school of lamps: a building for every paper, a Choosing that places you in one of four houses from your real study record, and a Charter Night when you clear a year. It sits beside The Ledger Seas and the everyday look, switched in Settings, Look and feel, **World**, and changes only words and pictures, never your data or your XP. The islands of the Ledger Seas, Blip, the app icon and the world pictures were all redrawn so that nothing is a recoloured template any more.

v6 gave the whole app an iOS-style interface (real spring motion, sheets you drag away, frosted glass, large titles). It is on by default, and Settings, Look and feel, **Interface** puts the v5 look back at once. v5 added a study timer that fills in your log for you, motion that keeps going without slowing the app, and the optional world The Ledger Seas.

## Run it

You need a current Node.js (20 or newer).

```bash
npm install
npm run dev        # http://localhost:3000 with live reload
npm run build      # production build into dist/
npm start          # serve dist/ on http://localhost:3000
npm run typecheck  # tsc --noEmit
npm test           # 191 checks: rewards, schedule, milestones, the timer, the Voyage and Lanternfell rules, island and building kinds, sound kits, the PDF engine and the iOS springs
npm run e2e:ios    # 71 checks in a real browser: sheets, alerts, switches, toasts, the top bar, the whole Lanternfell walk-through and the layout of every screen in all three worlds (needs Playwright and Chromium; add -- --full for the full scan)
npm run fps        # frame-rate sampler: every screen at each animation level (add -- --world=voyage or -- --world=academy)
npm run icons      # redraw public/icon.svg and the PNG icons from src/components/layout/Logo.tsx (needs Playwright and Chromium)
npm run pdf-sample -- --theme=sky --page=a4   # write a sample report PDF (see below)
```

Open the built app on your phone or tablet over your network, then use your browser's Install or Add to Home Screen option. It works offline after the first load.

## What is new in v7

**Lanternfell Academy, a third world.** Pick it in Settings, Look and feel, World. Everything underneath is the same app: your logs, marks, XP, streaks and rules are untouched, and plain words (Settings) turn the new labels off.

* **What I did with the request.** You asked for a Harry Potter world, the way The Ledger Seas follows One Piece. I did not draw or copy Harry Potter's characters, crests, castle, names or text, because they belong to someone else. Lanternfell is an original school-of-magic story with the same shape (four houses and a house cup, a castle with grounds, a choosing ceremony, a lantern that carries the day's letter, trials, a graduation). Every name, person, house, building, word and picture in it is new. A test scans `src/` and `public/` for borrowed names and fails if it finds one.
* **Your study becomes a school.** The level is a year (The Lower Court, The Upper Grounds, The High Keep). Each paper is its own building, one of ten hand-drawn places: the Counting House with its clock tower, the Statute Hall with columns and scales, the Orrery Dome, the Market Bridge, the Tithe Barn, the Toll Gate, the Foundry, the Watchtower, the Vault and the Map Tower. A ticked chapter lights a window. The part of a paper you have not explored is mist; ten idle days bring dust and ivy; a mock is a trial. Your standing runs from Wick through Spark, Ember, Flame, Torch and Beacon to Lantern-Warden and Keeper of Lanternfell (the same eight ranks, the same XP).
* **The Choosing.** On the Grounds screen, three questions are weighed against what you have really done in the last 28 days (60 percent your record, 40 percent your answers; with fewer than three days of data your answers decide alone). The four virtues are Grit (long runs of good days), Care (recent mock marks), Wit (how many papers you touch, how fast chapters close) and Steadiness (days studied out of the last 28). They give four houses: **Ashwold** the Wolf, **Mirewing** the Heron, **Emberquill** the Fox and **Hollowhearth** the Bear. You can be chosen again after 60 days. Four glass wells show your virtues, and the week's strongest takes the cup.
* **Where it shows up.** The Overview becomes the Atrium, with a card of the castle, the Headmistress's line for the day (worked out from your real pace) and your house. The Grounds screen is a map with a building for each paper; tap one for its panel. Behind every screen is the school on its crag across a lake, with drifting mist and a few fireflies. Five characters appear (the student, whose look you choose, Headmistress Vane, Archivist Bellweather, the lamplighter Madge Ashdown and Warden Reed); Blip is still your helper.
* **Charter Night.** Marking a year as cleared is your own act: it asks first and can be undone. Clearing CA Final plays Charter Night (28 lanterns rise) and offers a school record as a PDF.
* **A fourth sound kit, Lantern**: taps on lantern glass, a school handbell and soft celesta notes, built like the others by `tools/sfx/build_sfx.py`. It switches on with the world and gives your old kit back when you leave.
* New storage key `ca_academy_v1` (your house, the day you were chosen, your answers, the years you have cleared). Backups include it, and a restore puts it in place at once.

**Pictures redrawn, so nothing is a recoloured template.**

* **The Ledger Seas islands.** Before, every island was one template in a different colour. Now there are ten different places (counting house, statute hall, orrery, market, tithe barn, toll gate, foundry, watchtower, vault, chart house), each with its own ground, buildings and details, and a paper gets the same kind of place at sea and at school. The ships, harbour, moon, far isles and the Golden Ledger chest were redrawn too. The ghost ship is plain on purpose.
* **Blip** is the same gold character, redrawn: shaded limbs with highlights, mittens, a bolted collar, a stitched belly patch with the scope mark, and a face for each mood. The finest lines drop away at small sizes so he stays clean.
* **The app icon and logo** (a brass radar scope with Blip as the contact), the Voyage compass and the world picker, which now shows a real picture of each world.
* Everything is real SVG (shapes and text), not embedded pictures, so it opens in any vector tool. The icon PNGs are bigger (about 390 KB at 512 px) because they carry more detail.

**What I could and could not check in v7**

* **I cannot see it on your Moto Pad, hear it or feel it.** I checked what can be checked: 191 logic checks (including that every paper of every level gets a building and an island, that the map fits one to fourteen papers without overlap, and how houses are chosen); 71 checks in a real browser, which walk through opening the Grounds, picking buildings, the whole Choosing, joining a house, marking a year cleared and undoing it, Charter Night and the world picker, and scan every screen in all three worlds, both interfaces and three widths for sideways scrolling and console errors (none). Judging whether the art is beautiful, and the Choosing feels right, is for you.
* **Smoothness was measured in a software-rendered 60 Hz test browser**, a harsh proxy for a tablet's graphics chip. Every screen of all three worlds held 59.6 to 60 frames a second at full, calm and still motion at 1472 by 920, and the main screens also at double pixel density. That test found a real problem and it is fixed: the school backdrop first cost about 24 frames a second because the browser blended it again on every frame (36 against 60). It is now painted once into the sky behind the app. I have not run it on your tablet, so I cannot promise its 144 Hz.
* **The backdrop castle is a little soft on a sharp screen**, because it lives in the sky canvas, which is drawn at normal (not double) resolution. It is dim atmosphere; the sharp versions are on the Atrium card and the Grounds.
* **The Lantern sounds were checked by measurement, not by ear**: 41 sounds, no clipping (peaks between minus 3 and minus 19 dB), clean endings, and loudness matched to the Voyage kit.
* **The pictures were drawn in code and checked in screenshots.** There was no way to compare them with a hand-drawn original, and some scenes are dark on purpose.

## What is new in v6

**An iOS-style interface, on by default.** Settings, Look and feel, **Interface** switches between **iOS** and **Classic** (the v5 look, kept whole) with no reload and no change to your data. The Ledger Seas world keeps its own colours and fonts and gets the same motion and controls.

**Motion with real physics**

* Everything that opens, closes, slides or springs back follows a spring, as iOS motion does, instead of a fixed easing curve. There are four (smooth, snappy, bouncy, press). They are solved exactly in `src/lib/spring.ts` and written into the stylesheet as CSS curves by `tools/ios/springs.mjs`; a test fails if the two ever disagree.
* In gestures the spring starts at the speed of your finger. Flick a sheet and it leaves at that speed; let go slowly and it settles from where you let go; touch it again in mid-motion and it follows your finger again. That detail is most of what makes it feel like iOS.
* Every button, card and tab shrinks a little under your finger and springs back. The v5 ripple is not used in this look.

**Things you can pull, drag and flick**

* **Sheets.** Every dialog is a bottom sheet (a centred sheet on wide screens) with a grabber. Drag the grabber, the header, the footer, or the body when its content fits; pulled upwards it stretches with growing resistance. A flick down, or a pull past a third of its height, sends it away. Text fields and sliders never start a drag. Esc still closes it.
* **Alerts.** Confirmations (reset, delete, restore) are a small frosted card with the buttons in a row under hairlines, the confirming one focused. Nothing that asks for a confirmation changed.
* **Switches** are 51 by 31 points and the thumb can be dragged. It stretches while pressed, ticks when it crosses the middle, and settles on the nearer side.
* **Toasts** follow your finger sideways or down, fade a little, and fly off on a flick. They wait while a finger is on them.
* **Vibration feedback.** A short tick when you grab a sheet or a toast or a switch crosses its middle, a little more when something is sent away. Android can only vibrate for a length of time, not at a strength, so strength is length. It follows Settings, Vibration, and does nothing on a device without a vibration motor.

**Frosted glass, large titles and navigation**

* **Glass** on the top bar, the tab bar (phones and upright tablets), toasts and alerts. The sidebar is a plain translucent panel, because blurring it cost frames. Everything turns solid with Animation: Still, or when the system asks for reduced transparency.
* **Large titles.** Each screen opens with a 34 px title. As you scroll, the top bar turns to glass over the first 30 px and a small title fades in at its centre. The browser does this itself (scroll-driven animations, Chrome 115 and newer), so it does not depend on the app keeping up.
* **Wide screens** get a floating sidebar with a selection capsule that slides between items; **phones and upright tablets** get a floating tab bar with a capsule that glides. Menu icons are outlines that fill in on the screen you are on.
* **Controls.** A capsule segmented control with a sliding thumb, capsule buttons, a flat accent primary button, a larger slider thumb and inset text fields. Titles are set in Inter Display and text in Inter (both bundled; see `public/fonts/LICENSES.md`).
* **Corners.** Sheets, alerts, toasts, fields, buttons and the navigation use smooth "squircle" corners where the browser supports them (Chrome 139 and newer); elsewhere they are ordinary rounded corners. Big cards keep plain rounded corners on purpose (see below).

**Smaller things**

* Blip's tips and the help guide still said a day holds three sessions. It has held six since v5; the wording now says so.

**What I could and could not check in v6**

* **I cannot feel it.** There is no finger, no GPU and no vibration motor where this was built. I checked what can be checked: the spring maths against known values; that the CSS curves match the code; the position, timing and outcome of every gesture with real mouse input (sheet drag, flick and spring back, switch drag, toast swipe); every state of the top bar, including reduced motion; and that no screen scrolls sideways or logs an error in either interface, either world, at desktop, tablet and phone widths. Whether it feels right under your thumb is for your Moto Pad to say.
* **Smoothness was measured in a software-rendered 60 Hz test browser**, a harsh proxy for a tablet's graphics chip. There, every screen held 58 to 60 frames a second at 1472 by 920 (57.7 with the study timer running), 59.7 to 60 in the Ledger Seas world and on an upright tablet, and 60 at phone size. Scrolling a page under the frosted top bar held about 58, against 60 with the blur switched off. I have not run it on your tablet, so I cannot promise its 144 Hz.
* **What that testing changed.** A blurred full-height sidebar over the moving background cost about 20 frames a second, and squircle corners on cards that move cost about 5, so the sidebar has no blur and cards have round corners. A small sparkle inside the top bar was making the browser redo the blur behind it on every frame, so it holds still while the bar is glass. One thing is left: a sheen sweeping across a card that sits right under the glass bar can pull a screen to about 54 for the few seconds it takes. I tried slowing the background while you scroll; it made no measurable difference, so it is not in the app.
* **Vibration is length only.** On Android the browser has no strength control, so a "tick" and a "thud" differ in duration, not in force. They may feel closer to each other than iOS's do. Safari on iPhone and iPad does not support web vibration.
* **Older browsers** keep working but lose the polish: without scroll-driven animations the top bar stays clear and has no small title; without `corner-shape` the corners are round.
* **There is no light mode.** The app is dark only, as before.
* **Not in v6:** swiping back from the screen's left edge, the page shrinking behind a sheet, swipe-to-delete rows, and rolling digits on the timer.

## What is new in v5

**A study timer that writes your log for you**

* On Overview, the timer card lists your papers. Tap one and the clock starts (or press the big play button to choose first). While it runs, a small clock sits in the top bar on every screen with pause and stop, and **Focus mode** (full screen, big digits) is one tap away.
* **Stop, and the time is added to today's log by itself.** Studying the same paper two or three times in a day adds to **one** entry instead of making copies, and the topics are joined ("Ch 3; Ch 5"). A day's log now has **six** subject slots (it was three), so a busy day fits.
* It counts real time from the clock, not from ticking, so locking the tablet, switching to Google Docs or reloading loses nothing. Time spent paused never counts. A session that runs past midnight is split between the two days. Anything under 30 seconds is ignored.
* If the app was closed while the timer ran, it asks when you come back: keep going, stop and save everything, stop and save only until the last time the app was open, or discard. A session over 6 hours asks you to confirm. If you switch level while a timer is running, it tells you which level the time belongs to.
* Today's sessions are listed under the timer, each with **Undo**. Undo takes exactly that session's minutes back out of that paper's entry, even if you edited the log in between.
* Settings, Study timer: keep the screen awake, encouraging messages while timing, and an optional chime every 15, 25, 30, 45 or 60 minutes. The timer's own sounds (start, pause, resume, a gentle marker, saved) are real recordings in every sound kit.

**Everything moves, and it stays smooth**

* The app is no longer still when you are not touching it: a drifting glow and twinkling stars behind the app, a sweeping radar dial with pings, flowing stripes on progress bars, a flickering flame on streaks, breathing primary buttons, glowing quests you can collect, numbers that count up, and screens that slide the way you are going.
* How it stays fast: every large moving thing is its own layer holding a picture that is drawn once, and only `transform` and `opacity` ever move. Small loops (a flame, a shimmer) are cheap and everywhere; large ones are limited to what fits about one screen at a time.
* A small **motion governor** looks at how smoothly the device draws, in short bursts rather than a constant loop. If frames start dropping it turns the extras down a step, and back up when the device recovers. Settings, Look and feel, **Animation**: Auto, Full or Calm. Reduced motion (system or in Settings) stops every loop. Everything pauses when the tab is hidden.

**The Ledger Seas: an optional story world**

Settings, Look and feel, **World**. Pick "The Ledger Seas" to turn it on; "Everyday" is the default and your data never changes either way. **Plain words** keeps the look but uses ordinary words for menus and ranks.

* **The story.** You captain **The Double Entry** (rename it) across three seas: The Shallows (Foundation), The Narrows (Intermediate) and The Deep (Final), towards the **Golden Ledger**. You mark each sea cleared yourself. After CA Final the ending plays: dawn, the chest opens, gold, your crew. "Watch the ending" in Settings previews it any time.
* **The crew, all original and drawn in SVG with blinking, breathing and expressions:** **Sol**, the captain (you; choose skin, hair, coat and what you wear), **Odalys Quill**, navigator (plan and pace), **Tally Fenn**, quartermaster (XP and mocks), **Brine Hollis**, shipwright (weak papers), **Saffron Pell**, cook (streaks and rest) and **Blip**, the lookout. Their lines are written rules over your own numbers, not an AI. None of this is One Piece: no characters, names, logos or music from it.
* **The Sea chart** (a new screen in this world), driven by your real data:
  * One island per paper. **Lanterns** on the shore are the chapters you ticked in your plan. **Fog** is what is still unexplored: hours studied clear it up to a point (85% when you have a plan), and an island left alone for 10 days fogs over a little, as a nudge to revise it.
  * **Mocks are weather** over that paper for 45 days: 70% and over is clear, 50 to 69 fair, 40 to 49 rough water, under 40 a storm.
  * **Pace is the wind**: a tailwind when your last 7 days beat what your plan needs to finish before the exam, a headwind when they do not.
  * A **ghost ship** sails your best week so far, so you can race it.
  * Your ship sails to the paper you last studied, and works at its island while the timer runs. Its class grows with your level: sloop, brigantine, galleon.
  * **Voyage log so far** writes a captain's-log style PDF of the journey. The dashboard gets a sea card showing how far along the whole journey you are, and waves move quietly behind every screen.
* **Rank names** become Deckhand, Ledger Mate, Bosun, Navigator, First Mate, Captain, Commodore and Admiral of the Ledger (same ranks and XP as before, new names, also in PDF reports and celebrations).
* **A third sound kit, Voyage**: knocks on ship timber, plucked notes and a small bell. It switches on with the world and gives your old kit back when you leave (a kit you pick by hand while aboard is kept). You can also pick it by itself in Settings, Sound.
* Fonts for this world are Almendra (titles) and IM Fell English Italic (story text), both SIL OFL, self-hosted (see `public/fonts/LICENSES.md`).

**Smaller things**

* The logo's colours could vanish on phones, because every copy of it shared the same internal names and the visible one used the copy hidden in the sidebar. Each copy now has its own. This had been wrong since an earlier version.
* The service worker keeps only the first sound kit in the first download. Glass and Voyage are fetched when you pick them, then kept for offline use.

**What I could and could not check in v5**

* **I cannot hear.** The Voyage sounds and the five timer sounds were checked by measurement (loudness, spectrum, clipping, decay), and by confirming in a real browser run that the right kit loads and plays. Whether they are pleasing is for your ears. The earlier two kits are unchanged (decoded and compared sample by sample: identical to within 1 bit of rounding noise).
* **There is no music and no ocean ambience.** The ending is a short run of bells and chimes from the kit, not a composed score.
* **Smoothness was measured in a software-rendered, 60 Hz test browser**, which is a harsh proxy. Every screen in both worlds held 58 to 60 frames a second there, including the busy Sea chart at tablet pixel density. I have not run it on your Moto Pad, so I cannot promise 120 or 144 Hz, only that all the movement is the kind a graphics chip does cheaply.
* **The art is hand-coded SVG.** It is original and editable, but it is not hand-painted illustration. I cannot match another studio's characters.
* **The Foundation and Final chapter lists** that the islands use should be checked against the current ICAI syllabus.
* **Screens were checked** in both worlds at 1472 by 920, 840 by 1180 and 390 by 844: no sideways scrolling and no console errors. The ending was viewed on a tablet and on a phone-shaped screen.

## What came with v4

**Sound that is designed, not generated**

* 36 sounds (41 since v5, which adds the timer's five), made from scratch by a script (`tools/sfx/build_sfx.py`): soft wooden ticks, felt thumps and muted bells. No beeps, no chirps, no stock "app" noises.
* **Every kind of control has its own sound**, chosen by what the control is: a plain tap, a primary button, a choice, a tab or navigation, a switch on and off, a tick and untick, a stepper (each press climbs a gentle five-note ladder), copy, undo, delete, a dialog opening and closing, four kinds of notice, save, goal reached, week done, quest collected, badge, rank-up, streak freeze, Blip, and the tour steps. Nothing has to be wired by hand: a small engine looks at what you pressed. A control can opt out or pick another sound with `data-sfx="none"` or `data-sfx="save"`.
* One action makes one sound. A celebration is never drowned by the tap under it, and a quick burst of taps is thinned out instead of stacking up.
* The sounds are loudness-matched, pass through a gentle limiter, vary a hair each time so repeats do not feel mechanical, and lean left or right with where you tapped.
* **Settings, Look and feel, Sound**: on or off, volume, **Soft** or **Glass** kit, "Every tap" or "Key moments", vibration, and a **Sound lab** where you can tap every sound to hear it. Sounds are decoded without waiting for a first tap, and they work offline.
* Vibration on devices that allow it (Chrome on Android): a very small buzz with taps, ticks and rewards.

**Touch and motion**

* A soft ripple grows from your fingertip on buttons, chips, tabs and cards. It waits a moment on touch so it never fires when you are really scrolling.
* Small sparks and a ring on save and tick; gold XP orbs fly to your rank pill when you collect a quest; the glow behind the app flares for a moment when you reach a goal, a week or a rank.
* **Pages cross-fade** when you change screen (View Transitions, in Chrome, Edge and Safari 18 or newer; other browsers cut as before). New motion uses real spring curves.
* Everything moves with `transform` and `opacity` only, in one fixed layer, so it runs on the graphics chip. Nothing animates across the whole screen when you are idle, so the app costs almost nothing to leave open.
* A bug since an earlier version is fixed: the page body painted a solid colour over the background glow and stars, so they were never seen. They are now visible, and the glow is a touch stronger.

**PDF reports that look designed**

* Text is set in **Comic Relief**, embedded in the file. Comic Sans MS belongs to Microsoft and cannot be bundled, so this is the open-licence look-alike with the same letter widths (SIL OFL, see `public/fonts/LICENSES.md`). Text stays real: you can select it, search it and copy it.
* **Three looks**: Night (deep blue, glowing colours, best on a screen), Sky (bright and colourful) and Paper (clean white, least ink). **Two page shapes**: Tablet (wide 16:10, fills a tablet held sideways) and A4 (tall, for printing). Choose them in Settings, Reports. The saved daily reports use the same choice.
* Pages: a header with your exam countdown; eight summary tiles with icons; hours per day (or per week for long ranges) with the goal line; hours by paper with gradient bars; highlights; weekday rhythm; a mock-test table with score bars and result chips; and the day-by-day log with subject chips, wrapped topics and day totals.
* Symbols the font lacks (rupee sign, arrows, tick, star, shapes) are drawn as small vector icons, so a topic like "Rs 5,000 to 7,500" keeps its symbols. Emoji are left out.
* `npm run pdf-sample -- --theme=night --page=tablet --days=30` writes a sample with demo data (`--days=0` empty, `--weird` symbols and long text). Open it with any viewer, or `pdftoppm -png` to look at pages.

**What I could and could not check**

* I cannot listen. The sounds were checked by measurement (loudness, spectrum, clipping, how long each rings), not by ear. If a sound does not please you, change the kit, switch to "Key moments", or tell me which one and how it should feel.
* Smoothness was measured in a software-rendered test browser: idle, scrolling and switching screens each held a steady 16.7 ms per frame (that test browser is capped at 60 Hz). I have no 120 or 144 Hz screen to test on, and I have not run it on a Moto Pad. The design keeps frames cheap, but treat "120 FPS on your tablet" as untested until you try it.
* PDFs were checked with Poppler (render, fonts, text, structure) and in the browser download path. I did not open them in Google Docs, Drive or Word.

## What came with v3

**Blip, your helper**

* A small original character who lives in the corner. Tap Blip to open a help panel: what to do now, answers to common questions, and a search box.
* A first-run welcome and a 13-step guided tour. Each step dims the page, lights up one thing and explains it in a sentence or two. You can skip, go back, or restart it from Settings, Take the tour again.
* A short tip the first time you open each screen, and a nudge when something needs you, such as quests to collect or a streak at risk.
* On Monday and Tuesday, a one-line look back at last week.
* Drag Blip to the other side or higher up; the spot is remembered. In Settings you can set Blip to With tips, Quiet (no unprompted messages) or Hidden.
* **Blip is a set of plain rules over your own data.** It is not an AI model and nothing leaves your device. It answers from a written list of questions about this app, so it will not understand anything outside that list.

**Rewards that follow your effort**

* XP and streaks are worked out from your logs every time, so they can never drift or be edited by accident. Only collected quests and your highest rank are stored.
* **Daily and weekly quests** you collect with a tap, such as reaching your goal, studying two papers or giving a neglected paper an hour.
* **Exam readiness** (0 to 100) from your pace, consistency, mock scores and syllabus coverage, with a phase strip (Learn, Practise, Revise, Sprint, Final week) based on days left.
* **Streak freezes**: you earn one every 7 streak days (keep up to 2) and it is spent automatically on a miss. **Rest days** that you choose in Settings never break a streak.
* **Celebrations**: reaching your goal, a rank-up, a new badge, a freeze or a goal week shows a card with Blip, confetti and an XP count-up. They only appear for real changes, never when you restore a backup or open old data.

**Fewer, clearer screens**

* The 12 screens are grouped into 7 places: Overview, Study log, Mocks, Plan, Insights, Rewards and Settings. Related screens sit together as tabs, with a sliding highlight. Every old address (`#/log`, `#/heatmap` and so on) still works.
* **Schedule my syllabus**: list your chapters and hours (or import from Excel) and the app spreads them over the days you have left, around your rest days and non-study dates. Ticking a chapter in the syllabus and ticking its slot in the date plan stay in sync.

**Smoothness**

* The sidebar and bottom bar highlight glide to the active item, the Blip dock springs when you let go, panels and cards enter with a spring, and every animation uses only `transform` and `opacity`.
* Reduced motion is respected from the system setting and from Settings. Confetti, springs and the XP bump are turned off, and the celebration is a plain fade.

## What came with v2

**Look and feel**

* A visual language called "night observatory": a deep ink canvas, hairline glass cards and one accent colour at a time. Six accent themes are in Settings, Look and feel.
* The countdown to your exam sits inside a radar dial that shows today's hours.
* Fonts are self-hosted (Inter, Inter Display, TeX Gyre Adventor and Lora Italic), so nothing loads from a CDN. See `public/fonts/LICENSES.md`.
* Every screen works on a wide tablet in landscape, a tablet in portrait and a phone. The sidebar turns into a bottom bar on small screens.
* Charts are custom SVG with hover details, always-visible legends and a table view on the main charts, so values never depend on colour alone.

**Speed**

* Every screen is a separate chunk that loads on demand and is prefetched when the browser is idle. The whole app, all screens and Blip included, is about 211 KB gzipped (code and styles, fonts excluded).
* Long lists use `content-visibility`, and a service worker caches the app shell.

## Screens

| Place | Screens | What it does |
| --- | --- | --- |
| Overview | Overview | Countdown, the study timer and today's timed sessions, readiness, today's plan, quests, streak and rank (and, in the Ledger Seas world, a sea card) |
| Study log | Study log | A day-by-day log with up to six subjects a day, hour steppers, copy last day, per-slot targets and a searchable logbook |
| Mocks | Log a mock, Analysis, Target marks | Score entry with a live ring, grade and XP preview; group aggregates against the 50% and 40% rules; a marksheet where you write the marks you aim for |
| Plan | Schedule, Plan vs actual | A syllabus schedule (Excel import, ticks, pace per day) or a date plan (slots per day, backlog); a verdict on whether you are on pace |
| Insights | Trends, Heatmap, Papers | Daily, weekly and weekday charts; a year of study as a calendar grid; time per paper, balance and chapters covered |
| Rewards | Rewards | Quests, ranks, XP breakdown, streaks and badges |
| The Ledger Seas | Sea chart | Only when that world is on: the islands, weather, wind and ghost ship, your crew, your ship and captain, the seas you have cleared, the ending and the Voyage log |
| Lanternfell | The Grounds | Only when that world is on: the school map with a building for every paper, the Choosing and your house, the four wells and the cup, marking a year cleared, Charter Night and the school record |
| Settings | Settings | Profile, level and papers, theme, rest days, Blip, head start, reminders, PDF reports, backup and restore, data reset |

## The rewards rules

These are the exact rules, so you can check any number you see.

* **XP**: 10 per study hour (up to 12 hours a day count), 5 per head-start hour from Settings, +40 on a day you reach your goal, +60 on a day of 10 hours or more, and 20 to 80 per mock test (20 plus 0.6 per percent scored). Collected quests add their XP on top.
* **Streak day**: a day counts when you study three quarters of your daily goal (never less than 2 hours or more than 6). Today stays pending until you get there, so it never breaks a streak partway through the day.
* **Freeze**: one is banked every 7 streak days, up to 2. A missed day spends one if you have it. Days you set as rest days are skipped.
* **Goal week**: a Monday to Sunday week where your hours reach your daily goal times your study days that week (7 minus your rest days, at most 5).
* **Ranks**: eight titles from Fresh Aspirant to FCA Legend. The XP needed for each scales with your daily goal and the days you have until the exam. A rank you have reached is kept and never drops, even if you change your goal or exam date.
* **Readiness**: study pace (25 points), consistency (15), mock tests (30) and syllabus coverage (30). With no mock logged it is capped at 80.
* **Phases** by days left: Learn above 120, Practise 61 to 120, Revise 22 to 60, Mock sprint 8 to 21, Final week 7 or fewer.

## Behaviour that is different from the original

These were deliberate. Please read them before you rely on old numbers.

* **XP and ranks were rebalanced again in v3.** The v2 rules (elite weeks, fixed XP per mock) are gone and replaced by the rules above. Your XP total and rank can differ from what v2 showed. Your logs and mocks are untouched; only the way they turn into XP changed.
* **Mock pass rule.** A pass needs 50% in aggregate and at least 40% in every paper. The 40% floor is judged on your average for each paper, not on a single mock.
* **One exam date.** The exam date lives in Settings only. The separate per-level exam date in the old Targets screen is gone.
* **Two kinds of rest.** Rest days in Settings are weekdays you take off (they protect your streak). Non-study dates in Schedule are particular dates, such as a festival or a trip (they move your plan). The old app shipped a fixed list of non-study days; the new one starts empty.
* **Syllabus papers follow your level.** An imported Excel list is matched to the papers of the level and group you have open. The original assumed seven fixed Intermediate names and left out Financial Management.
* **Backlog works from the date plan only.** A planned slot becomes backlog when its day has passed, it has a topic, and you neither ticked it nor logged hours for that paper on that day.
* **Backups need the right level.** A backup file made by this version records its level. It will not be restored into a different level, so a Foundation file cannot overwrite your Final data. Files from the old app have no level and go into the level you have open.
* **Sign-in and cloud sync were removed.** See `legacy/README.md`. The old `/api/send-otp` SMS endpoint is not carried over. It accepted any phone number and code from any caller and sent real SMS through your Twilio account.
* **A day's log has six slots (v5).** Older three-slot logs open as before. Timed sessions merge into the entry with the same paper name (ignoring capital letters and extra spaces). A day cannot go over 24 hours; if a session would push it past that, the extra minutes are trimmed and the app says so.
* **Rank names depend on the world (v5, v7).** In The Ledger Seas the eight ranks have nautical names and in Lanternfell they have lamp names. The ranks, the XP they need and your progress are the same; only the label changes (Plain words turns the new labels off).

## Your data

Everything lives in `localStorage` under the same key names as the original (`ca_study_logs_v4_<level>`, `ca_mock_scores_v4_<level>`, `ca_settings_v3` and so on), with one set of plan keys per level and group. v3 adds three small ones: `ca_game_v1_<level>` (collected quests and your highest rank), `ca_seen_v1_<level>` (which celebrations you have already seen) and `ca_assistant_v1` (Blip's position and which tips you have seen). Nothing leaves the device.

To move from v2 or the original app: open it, go to Settings and export a backup, then open this app and use Settings, Backup, Restore from a backup. The restore dialog lets you merge into or replace what is already there. Backups from v2 restore into v3, and the new records are simply created fresh. A backup restored here, or a data wipe, never triggers celebrations.

v7 adds one storage key, `ca_academy_v1` (your Lanternfell house, when you were chosen, your three answers and the years you have cleared). It is part of a backup, and restoring a backup changes your house at once. Resetting your data does not touch it (the way the Ledger Seas voyage is not touched either): a house changes through the Choosing, and a cleared year through Undo. It never changes your logs or XP.

v6 adds no storage keys: the Interface choice is one more field in `ca_settings_v3`.

v5 adds three keys: `ca_timer_v1` (a timer in progress; it is not part of a backup, because it only makes sense on the device that is timing), `ca_timer_sessions_v1_<level>` (your last 300 timed sessions for that level) and `ca_voyage_v1` (ship name, captain look, seas you have cleared). Backups include the last two.

Browsers can clear site data. Use Settings, Backup now and then, and use "Protect data" in Settings, This app, to ask the browser not to evict it.

PDF reports are made in the browser by a small built-in writer (`src/lib/pdf.ts` for fonts, shapes, gradients and compression; `src/lib/reportPdf.ts` for the pages). Excel import and the template are handled by a built-in reader and writer (`src/lib/xlsx.ts`). The optional daily report saves a PDF into a folder you pick, on browsers that support folder access (Chrome and Edge on desktop).

## Project layout

```
src/
  App.tsx, main.tsx        app shell, level and study providers, daily report runner
  config/                  curriculum (papers per level) and navigation (12 screens, 7 places)
  context/                 LevelContext, StudyContext (data, stats, quests, backup)
  lib/                     pure logic: stats, quests, readiness, phases, schedule, milestones,
                           assistant (Blip's rules), dates, storage, targets, backlog,
                           planAnalysis, manifest, xlsx, pdf, reportPdf, sfx (sound engine and haptics), fx (touch effects),
                           spring (the spring maths, the rubber band, finger speed), ui (which interface is on), pageTitle
  hooks/                   useDialog, useMedia, useSheetDrag (drag a sheet away), useSwipeAway (toasts)
  components/blip/         the Blip character (plain SVG shapes, CSS motion)
  components/game/         quest list and the celebration cards
  components/ui/           Button, Card, Modal, Toast, Field, Segmented, Ring...
  components/charts/       Trend, Bar, Donut, HBar and the table switch
  components/layout/       Shell, sidebar, bottom bar, section tabs, logo
  features/assistant/      Blip's dock, help panel, welcome and tour (tourSteps.ts holds the 13 steps)
  features/<screen>/       one folder per screen, loaded on demand
  features/timer/         the timer card, top-bar clock, focus mode, today's sessions and the prompts (logic is in lib/timer.ts and context/TimerContext.tsx)
  world/                  the optional Ledger Seas world: words (menu and rank labels), skin.css (colours and fonts), the World picker,
                          crew/ (the six characters and their lines), voyage/ (sea chart, island and ship art in isles/, ending, rules in progress.ts, Voyage log PDF),
                          academy/ (Lanternfell: choosing and virtues, the Grounds map, Charter Night, school record PDF, art/ with the ten buildings, four crests, five characters and the castle scene)
  styles/                  tokens, base, ui and layout CSS (a hand-written design system); ios.css (tokens, springs, glass, controls and
                           navigation) and ios-overlays.css (sheets, alerts, toasts) apply only while <html data-ui="ios">
scripts/                   build, dev, serve, icons, demo seed, logic tests, browser tests (e2e-ios.mjs), screenshot tool, frame-rate sampler (fps.mjs), sample report writer
tools/ios/                 `node tools/ios/springs.mjs` prints the CSS spring curves that are pasted into styles/ios.css
docs/                      v5-design.md, v6-design.md and v7-design.md: how the timer, the worlds and the iOS look were built, and what to know before adding big pictures, for whoever picks it up next
tools/sfx/                 the sound designer (Python): `python3 tools/sfx/build_sfx.py` rebuilds all three kits in public/sfx (needs Python 3 with numpy and scipy, and ffmpeg)
public/                    fonts, icons, manifest
legacy/                    files from the old export that are no longer used
```

The build is a short esbuild script, not Vite. There is no Tailwind. Styling is a small hand-written design system in `src/styles` plus one CSS file per screen.

Blip's tour steps and help answers are plain text in `src/features/assistant/tourSteps.ts` and `src/lib/assistant.ts`, so you can reword them. The character is drawn in `src/components/blip/Blip.tsx` as ordinary SVG, so it opens in any vector tool. The logo is drawn once, in `src/components/layout/Logo.tsx`, and `npm run icons` writes the icon files from it.

`npm run snap -- --tab=DASHBOARD --out=/tmp/x.png` builds the app, loads demo data and saves a screenshot. It needs Playwright and a Chromium install. Run `npx playwright install chromium` once if you want to use it.

## What I could not verify

* **Type checking used a loose React shim.** The package registry was blocked in the sandbox where this was built, so `@types/react` was not available. I checked the code against a hand-written stand-in for the React types. Strict mode, unused-variable checks and every other compiler option still ran. Please run `npm run typecheck` after `npm install`. If it reports anything, it will most likely be a small typing detail around React props.
* **Smoothness was measured in headless Chromium without a GPU.** There were no slow tasks across the screen changes I tried. I have not run the app on your Moto Pad, so I cannot promise frame rates there.
* **Sound and vibration were not heard or felt.** The celebration chime and phone buzz are coded and switch off with the sound setting and reduced motion, but the sandbox has no speakers or vibration motor.
* **The Monday and Tuesday recap was checked by tests, not by eye.** The sandbox date is a Friday, so I never saw the recap bubble on screen. The rule behind it (what it says and when it appears) has its own tests.
* **The tour, help panel, celebrations and every screen were checked in headless Chromium at 1472 by 920, 900 by 1200 and 390 by 844.** No screen scrolled sideways and there were no console errors. I did not test Safari or Firefox.
* **There are far fewer dependencies than before.** Vite, Tailwind, motion, Recharts, SheetJS, jsPDF and Tone were replaced by built-in code, because the package registry was blocked where this was built. Firebase and Express left with the sign-in and the server. The three runtime packages are `react`, `react-dom` and `react-icons`. The Gemini SDK and the `GEMINI_API_KEY` setting from the export were never used by the app, so they are gone too.
* **Restoring an old backup was tested with a file I built, not a real one.** I made a v2-style backup from the app's own export and restored it. I did not have a real export from your copy of the old app, so please check the day and mock counts in the restore dialog before you confirm.
* **The old app's screens were not run side by side with this one.** Feature parity comes from reading the original source line by line, not from comparing outputs.
