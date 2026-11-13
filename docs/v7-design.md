# v7 design notes: Lanternfell Academy and the art pass

Source of truth for the v7 build. Read this first after any context reset.

## 0. What the user asked for
"Same way like One Piece, add a Harry Potter theme, but more accurate as original, and fix the generic slop like SVGs. I want more detailed."

Reading taken (told to the user): Harry Potter's own characters, crests, castle, names and text are not drawn or copied. The new world is an
ORIGINAL school-of-magic story that follows the same shape (four houses and a house cup, a castle with grounds, a choosing ceremony,
letters delivered by something that flies, classes and trials, a graduation), with original names and much more detailed, individually
drawn SVG art. Second half of the request: the old art (Ledger Seas islands cloned from one template, Blip as a plain blob) gets redrawn.

Nothing in the repo may use: Hogwarts, Gryffindor, Slytherin, Ravenclaw, Hufflepuff, Quidditch, Muggle, Horcrux, Patronus, Sorting Hat,
Diagon, Dumbledore, Snape, Hermione and the like. A test greps the whole of `src/` for a list of such words.

## 1. The third world: `academy` (Lanternfell)
`World = 'default' | 'voyage' | 'academy'`; `<html data-world="academy">`. Picked in Settings (WorldPicker has three cards).
Same data, same rules as the Ledger Seas (progress.ts is reused as is): only the words and the pictures change.

| App thing | Lanternfell word | Picture |
|---|---|---|
| Level (Foundation / Inter / Final) | Year (The Lower Court / The Upper Grounds / The High Keep) | the grounds map |
| A paper (subject) | A building, one per paper | one of 10 hand-drawn landmarks |
| A ticked chapter | A lit window | window slots in the building art |
| Fog (unexplored share) | Mist over the building | mist layer |
| Neglect (10 days idle) | Dust and ivy | ivy layer |
| Mock test | A trial | result line on the building card |
| Pace against exam | The draught (fair / cross / head) | words only |
| XP rank | Standing: Wick, Spark, Ember, Flame, Beacon, Lantern-Warden | rank crest |
| Sorting ceremony | The Choosing | the Choosing Lantern + four wells |
| House points | The four wells: your measured Grit, Care, Wit, Steadiness | glass wells that fill |
| House cup | The week's strongest virtue takes the cup | cup on the card |
| Letters | Lantern-post: a paper lantern brings the day's letter | post lantern |
| Final cleared | Charter Night: the Charter is signed, lanterns released | finale + record PDF |

### Houses (four crests, drawn in detail)
* **Ashwold, the Wolf**: Grit. Measured from the longest streak and the hours on the hardest days.
* **Mirewing, the Heron**: Care. Measured from mock marks and revision (marks percent on recent trials).
* **Emberquill, the Fox**: Wit. Measured from range (papers touched) and chapters closed per hour.
* **Hollowhearth, the Bear**: Steadiness. Measured from days studied out of the last 28.
`scoreVirtues(data)` is pure (0 to 100 each). `chooseHouse(virtues, answers)` blends the measured virtues (60 percent) with three
questions the student answers at the Choosing (40 percent), so a brand-new student with no data is still chosen by their own answers.
The choice is stored; the student may be re-chosen once a term (the button is behind a confirm).

### Cast (all original; busts with expressions)
Student (the player: a learner with a small lantern, look chosen from 6 skin/hair/robe options), Headmistress Vane (tall, silver braid
crown, green shawl), Archivist Bellweather (round, ink-stained, spectacles on a chain), Madge Ashdown (lamplighter: ladder, pole,
soot freckles), Warden Reed (thin, long grey coat, brass whistle, trial warden). Blip stays the assistant in every world.

### Landmarks (10, individually drawn; every one has 8 window slots, a door, a flag point and its own props)
| id | name | used for |
|---|---|---|
| counting | The Counting House (clock tower) | Accounting, Advanced Accounting, Financial Reporting |
| statute | The Statute Hall (columns, scales) | Business Laws, Corporate & Other Laws |
| orrery | The Orrery Dome (copper dome, telescope, armillary) | Quantitative Aptitude, SFM |
| market | The Market Bridge (humped bridge, stalls) | Business Economics |
| tithe | The Tithe Barn (timber barn, loft hoist) | Indirect Tax (both levels) |
| toll | The Toll Gate (gatehouse, portcullis, barrier) | Direct Tax (both levels) |
| foundry | The Foundry (brick works, furnace, water wheel) | Cost & Management Accounting |
| watch | The Watchtower (crag light, lens lantern) | Auditing (both levels) |
| vault | The Vault (domed treasury, round door) | Financial Management |
| maptower | The Map Tower (octagonal glass room) | Strategic Management, IBS |
A custom subject takes `LANDMARK_ORDER[paperNumber % 10]`.

## 2. Art rules (the "no generic slop" bar)
* Moonlit storybook. One moon, upper left: left faces take a cool rim, right faces fall to blue-violet; windows throw warm light.
* Every building has its own silhouette and its own micro-details (clock, scales, telescope, etc.). No shared template.
* Real `<pattern>` fills for stone, slate and planks with per-block variation from a seed (`kit.tsx`), not flat colour.
* Windows are lit by a CSS class: `.lw` (glass) and `.lh` (halo) are hidden until `.on`, with a fade. React sets `on` per slot.
* Mist, ivy, dust and the pennant are separate overlay layers (`.pen` shown when cleared).
* Gradient ids carry a prefix (`useId()`), because one building can be on screen twice.
* Everything is real SVG (shapes, text where there is text), editable in any vector tool. No raster art.
* Motion rules from v5 still apply: transform and opacity only, ambient loops in their own composited layers, big scenes split into layers.

## 3. Files
* `src/world/academy/art/kit.tsx` helpers; `art/landmarks/*.tsx` the ten buildings; `art/crests.tsx`; `art/scene.tsx` (castle backdrop);
  `art/seal.tsx`; `art/cast/*`; `art/props.tsx` (Choosing Lantern, wells, charter, post lantern).
* `src/world/academy/` state, houses, sorting, Grounds map, finale, record PDF, skin.
* Plumbing touches: `world/index.ts`, `words.ts`, `WorldPicker.tsx`, `skin.css`, `components/layout/*`, `config/nav.ts`,
  `features/registry.ts`, dashboard card, settings, `lib/{reportPdf,dailyReport,sfx}.ts`, `StudyContext`, `types.ts`.

## 4. Checklist (update as you go)
- [x] kit helpers; Counting House, Statute Hall, Orrery Dome drawn and checked in the art lab
- [x] Market Bridge, Tithe Barn, Toll Gate, Foundry, Watchtower, Vault, Map Tower (all ten in `art/landmarks/*.tsx`, checked in the lab)
- [x] four crests (`art/crests.tsx`), cast busts (`art/cast/*`: Cast.tsx draws Vane, Bellweather, Reed, Madge and the student with the crew's ten expressions; checked in the lab)
- [x] castle scene (`art/scene.tsx` + `scene.css`), brand seal (`art/seal.tsx`), Choosing Lantern, wells, charter, post lantern (`art/props.tsx` + `props.css`); all checked in the lab
- [x] plumbing (type, words, nav, skin, backdrop, picker, settings, reports, sound)
- [x] state, virtues, choosing, Grounds map, dashboard card, finale (Charter Night), record PDF
- [x] redraw old art (Ledger Seas islands, ships, scenery, Blip, Logo and icons, Voyage compass, picker thumbnails)
- [x] tests (191 logic checks), e2e (71 browser checks with the three-world scan), fps (all three worlds, 60 on every screen), README, 7.0.0
- [ ] clean-room zip and delivery

## 5. Lab workflow (not shipped)
Bundle an entry with esbuild (one React copy), `renderToStaticMarkup`, screenshot a contact sheet, look at it, fix, repeat.
Scratch work (art lab pages, profiling and screenshot scripts) was kept outside the project, so none of it is in the repo or the zip.

## 6. Art API (all drawn, checked in the lab; props are plain data, all text is real SVG text)
* `art/crests.tsx`: `HouseCrest({house, size, title?, idPrefix?})`.
* `art/cast/Cast.tsx`: `Cast({who: 'student'|'vane'|'bellweather'|'madge'|'reed', expr?: Expr, size?, look?: StudentLook, house?: HouseId, gaze?, still?, className?, title?})`;
  `art/cast/types.ts`: `CAST`, `CAST_ORDER`, `StudentLook`, `STUDENT_CHOICES`, `DEFAULT_STUDENT`, `ROBE_COLORS/NAMES`, `STUDENT_HAIR_NAMES`, `STUDENT_ACCESSORY_NAMES`, `normaliseLook`.
  Faces and idle motion come from `crew/Crew.tsx` (`Face`, now exported) and `crew.css`; props use `ac-*` classes in `cast/cast.css`.
* `art/scene.tsx`: `CastleScene({id, className?})` (the whole still scene, 16:9), the layers `SceneSky/SceneFar/SceneCastle/SceneLake/SceneNear/SceneMist({id, className?})` (same 1600 x 900 stage),
  `Fireflies({n?, seed?, className?})` (CSS motion in `scene.css`).
* `art/seal.tsx`: `Seal({size?, title?, idPrefix?, text?})`: the brand mark.
* `art/props.tsx`: `ChoosingLantern({size?, house?, lit?, idPrefix?, still?})`, `Well({house, level 0..1, size?, idPrefix?, still?})` (four different vessels),
  `Charter({name?, house?, size?, idPrefix?, lines?})`, `PostLantern({size?, letter?, idPrefix?, still?, color?})`.
* Landmarks: `art/landmarks/*.tsx` (see section 1 table), each exports a `LandmarkDef` with `Art({id, lit})`, `slots`, `door`, `flag`, `box`.
* The Ledger Seas redraw, Blip, the logo and the academy backdrop are done too: see sections 7 and 8.

## 7. The older art, redrawn (where it lives now)
* **Ledger Seas islands.** `world/voyage/isles/`: `kinds.ts` (pure: the ten kinds and which paper gets which, tested), `kit.tsx` (shared pieces: shaded ground,
  patterns, lantern posts), `terrain.tsx` (the ground of each kind), `structuresA.tsx` and `structuresB.tsx` (the ten places: counting, statute, orrery, market,
  tithe, toll, foundry, watch, vault, chart), `Isle.tsx` (an island on the chart). Island art is static: no filters, no blurs. The school and the sea draw the same
  kind of place for the same paper (`landmarkIdFor` and `isleKindFor`; a test checks every paper of every level).
* **Ships, scenery, sea gates.** `voyage/ships.tsx` (the brigantine, the ghost ship is deliberately plain), `voyage/scenery.tsx` (moon, far isles, harbour, the Golden Ledger
  chest and islet), used by `Sea.tsx`, `VoyageCard.tsx` and `Finale.tsx`.
* **Blip.** `components/blip/Blip.tsx` redrawn from the rig up: tube limbs with highlights, mittens, a bolted collar, a stitched belly patch with the scope mark, eyes,
  brows and mouths per mood, a thinking pose with the hand on the cheek, sparks, Zs, drops and dots. The API and every `blip-*` class are unchanged. `blip.css` hides the
  finest lines at small sizes (`blip--tiny`, `blip--small`, set in JSX; do not use style-attribute selectors, they do not match in the static renderer).
* **Logo and icons.** `components/layout/Logo.tsx` is the one place the brand mark is drawn (a radar scope with Blip as the contact). `npm run icons` (`scripts/make-icons.mjs`;
  needs only esbuild and Playwright) writes `public/icon.svg` and the four PNGs. `world/VoyageMark.tsx` is the compass. The World picker cards show the real art
  (`voyage/PickerArt.tsx`, `academy/PickerArt.tsx`, and the Logo for Everyday).
* Every art component takes its gradient and clip ids from `useId()` (sanitised): SVG ids are global to the page.

## 8. Performance notes (read before adding any big picture)
* The sky canvas (`lib/sky.ts`) is opaque and holds the still backdrop. Anything big and translucent ABOVE it has to be blended again on every frame the page moves.
  In the software test browser the Lanternfell castle as a DOM layer cost about 24 frames a second (36 against 60); an SVG `mask` on it made that worse, and moving
  it under the canvas hid it completely (the canvas is opaque). The fix: the castle is rendered once to an image (`academy/skyScene.tsx`, from the same scene components)
  and painted into the canvas's still backdrop through `Sky.setStill`, so it is part of the picture that is copied on every redraw. Mist and fireflies stay in front as
  small layers that move with transform and opacity only.
* `npm run fps -- --world=academy` measures every screen, including the Grounds. The still level is measured by loading the page in reduced-motion; flipping
  `data-motion` after load exaggerates the cost, because the page is still in the middle of its own entrance animations.
* Results at the end of v7 (software-rendered 60 Hz Chromium, 1472 by 920, also at double pixel density): all three worlds hold 59.6 to 60 on every screen at full, calm and still.
* Tests: `npm test` (191 logic checks, including a scan of `src/` and `public/` for borrowed names) and `npm run e2e:ios -- --full` (71 browser checks, including the walk
  through the Choosing, joining a house, marking a year cleared with Undo, Charter Night and the layout scan over all three worlds).
