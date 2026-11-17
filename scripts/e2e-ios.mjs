// Browser checks for the iOS interface, driven with real mouse input in headless Chromium.
//
//   node scripts/e2e-ios.mjs            sheets, alerts, switches, toasts, the glass top bar, the Classic fallback, a quick layout scan
//   node scripts/e2e-ios.mjs --full     the same, with the layout scan over every screen
//
// Builds the app, serves it, seeds demo data. Exits with 1 when a check fails.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withApp } from './snap.mjs';

const full = process.argv.includes('--full');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log('  ok  ' + name); } else { failed++; console.error('FAIL  ' + name + (detail ? '\n      ' + detail : '')); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const ROUTES = ['overview', 'log', 'mock', 'mock-analysis', 'rewards', 'heatmap', 'analytics', 'subjects', 'targets', 'plan', 'manifest', 'sea', 'grounds', 'settings'];
const QUICK = ['overview', 'log', 'plan', 'settings'];

await withApp({ w: 1472, h: 920 }, async ({ page, app, errors }) => {
  // Settings are changed through localStorage and a reload, the way a person would meet them on the next start.
  async function prep({ ui = 'ios', world = 'default', extra = {} } = {}) {
    await app.goto('DASHBOARD');
    await page.evaluate(({ ui, world, extra }) => {
      const s = JSON.parse(localStorage.getItem('ca_settings_v3') || '{}');
      Object.assign(s, { ui, worldTheme: world, motionLevel: 'full', reduceMotion: false, hudChimes: false }, extra);
      if (world === 'voyage') s.sfxKit = 'voyage';
      if (world === 'academy') s.sfxKit = 'lantern';
      localStorage.setItem('ca_settings_v3', JSON.stringify(s));
      localStorage.setItem('ca_assistant_v1', JSON.stringify({ welcomed: true, tourDone: true }));
    }, { ui, world, extra });
    await page.reload(); await page.waitForSelector('#root > :not(#boot)'); await sleep(1200);
  }
  const go = async (slug, wait = 900) => { await page.evaluate((s) => { location.hash = '#/' + s; }, slug); await sleep(wait); };

  // ───────── 1. The top bar ─────────
  console.log('Top bar');
  await prep();
  const bar = () => page.evaluate(() => ({
    scrollable: document.documentElement.scrollHeight > innerHeight + 2,
    glass: +getComputedStyle(document.querySelector('.topbar-glass')).opacity,
    title: +getComputedStyle(document.querySelector('.topbar-center')).opacity,
  }));
  await go('plan');
  let b = await bar();
  check('a page too short to scroll has a clear bar and no small title', !b.scrollable && b.glass === 0 && b.title === 0, JSON.stringify(b));
  await go('log'); await page.evaluate(() => scrollTo(0, 400)); await sleep(300);
  b = await bar();
  check('scrolling a long page brings in the glass and the small title', b.scrollable && b.glass === 1 && b.title === 1, JSON.stringify(b));
  // The glass is a live blur of what is behind it: a loop inside the bar redraws it every frame, so the bar's sparkle holds still meanwhile.
  const spark = () => page.evaluate(() => ({
    scrolled: document.querySelector('.topbar').hasAttribute('data-scrolled'),
    play: getComputedStyle(document.querySelector('.topbar .xp-ic svg')).animationPlayState,
  }));
  let sp = await spark();
  check('once the bar is glass, the sparkle inside it holds still', sp.scrolled && sp.play === 'paused', JSON.stringify(sp));
  await page.evaluate(() => scrollTo(0, 20)); await sleep(250);
  sp = await spark();
  check('it lets go only below 12 px, so the line does not flicker', sp.scrolled && sp.play === 'paused', JSON.stringify(sp));
  await page.evaluate(() => scrollTo(0, 0)); await sleep(250);
  sp = await spark();
  check('at the top of the page the sparkle moves again', !sp.scrolled && sp.play === 'running', JSON.stringify(sp));
  await page.evaluate(() => scrollTo(0, 25)); await sleep(250);
  sp = await spark();
  check('and 25 px is not far enough to hold it', !sp.scrolled && sp.play === 'running', JSON.stringify(sp));
  await page.evaluate(() => scrollTo(0, 400)); await sleep(300);
  await go('plan', 1300);
  b = await bar();
  check('going from a scrolled long page to a short one leaves the bar clear', b.glass === 0 && b.title === 0, JSON.stringify(b));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go('log'); await page.evaluate(() => scrollTo(0, 160)); await sleep(300);
  b = await bar();
  check('reduced motion keeps the scroll-linked glass', b.glass === 1 && b.title === 1, JSON.stringify(b));
  await page.evaluate(() => scrollTo(0, 0)); await sleep(300);
  b = await bar();
  check('and the bar is clear again at the top', b.glass === 0 && b.title === 0, JSON.stringify(b));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // ───────── 2. A sheet you can drag away ─────────
  console.log('Sheets');
  await prep();
  await go('overview');
  const sheet = () => page.evaluate(() => { const m = document.querySelector('.modal'); if (!m) return null; const r = m.getBoundingClientRect(); return { top: Math.round(r.top), tf: m.style.transform, drag: m.classList.contains('is-dragging'), grab: getComputedStyle(m.querySelector('.modal-grab')).display }; });
  await page.getByRole('button', { name: /Add hours/ }).first().click();
  await sleep(1000);
  const open = await sheet();
  check('a sheet opens with its grabber showing', !!open && open.grab !== 'none', JSON.stringify(open));
  let box = await page.locator('.modal-head').boundingBox();
  const sx = box.x + box.width / 2 - 80, sy = box.y + 20;
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 7; i++) { await page.mouse.move(sx, sy + i * 12); await sleep(80); }
  const dragged = await sheet();
  check('it follows the finger one to one', !!dragged && dragged.drag && near(dragged.top - open.top, 84, 6), JSON.stringify(dragged));
  await sleep(200); await page.mouse.up(); await sleep(900);
  const back = await sheet();
  check('let go slowly, it springs back to where it was', !!back && near(back.top, open.top, 1) && !back.drag && back.tf === '', JSON.stringify(back));
  box = await page.locator('.modal-head').boundingBox();
  const fy = box.y + 20;
  await page.mouse.move(sx, fy); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(sx, fy + i * 38); await sleep(12); }
  await page.mouse.up(); await sleep(900);
  check('a quick flick down sends it away', (await sheet()) === null);
  await page.getByRole('button', { name: /Add hours/ }).first().click(); await sleep(900);
  check('and the page still answers: it opens again', (await sheet()) !== null);
  await page.keyboard.press('Escape'); await sleep(700);
  check('Escape closes it', (await sheet()) === null);
  // A text field inside a sheet must never start a drag: dragging across it selects text, the sheet stays.
  await page.getByRole('button', { name: /Add hours/ }).first().click(); await sleep(900);
  const field = page.locator('.modal input, .modal textarea').first();
  if (await field.count()) {
    const fb = await field.boundingBox(); const t0 = (await sheet()).top;
    await page.mouse.move(fb.x + 20, fb.y + fb.height / 2); await page.mouse.down();
    await page.mouse.move(fb.x + 20, fb.y + fb.height / 2 + 60, { steps: 6 }); await page.mouse.up(); await sleep(200);
    check('a drag that starts in a text field does not move the sheet', near((await sheet()).top, t0, 1));
  }
  await page.keyboard.press('Escape'); await sleep(700);

  // ───────── 3. Alerts ─────────
  console.log('Alerts');
  await go('manifest');
  const reset = page.getByRole('button', { name: /^\s*Reset\s*$/ }).first();
  await reset.click(); await sleep(500);
  check('a confirm is an alert (a small card, buttons in a row), not a sheet', (await page.locator('.ios-alert').count()) === 1 && (await page.locator('.modal').count()) === 0);
  check('the confirming button has the focus', (await page.evaluate(() => (document.activeElement?.textContent || '').trim())) === 'Reset');
  await page.locator('.ios-alert-actions button').first().click(); await sleep(450);
  check('Cancel closes it', (await page.locator('.ios-alert').count()) === 0);
  await reset.click(); await sleep(450); await page.keyboard.press('Escape'); await sleep(450);
  check('Escape closes it', (await page.locator('.ios-alert').count()) === 0);
  await reset.click(); await sleep(450); await page.locator('.ios-alert-actions button').nth(1).click(); await sleep(450);
  check('the red button runs the action and closes it', (await page.locator('.ios-alert').count()) === 0);
  check('and the page can scroll again', (await page.evaluate(() => getComputedStyle(document.body).overflow)) === 'visible');

  // ───────── 4. Switches ─────────
  console.log('Switches');
  await go('settings');
  const sw = page.locator('[role="switch"]').first();
  await sw.scrollIntoViewIfNeeded();
  const state = () => sw.getAttribute('aria-checked');
  const sbox = await sw.boundingBox();
  check('a switch is 51 by 31 points', near(sbox.width, 51, 0.5) && near(sbox.height, 31, 0.5), JSON.stringify(sbox));
  const s0 = await state(); await sw.click(); await sleep(450); const s1 = await state(); await sw.click(); await sleep(450); const s2 = await state();
  check('a tap flips it, a second tap flips it back', s0 !== s1 && s0 === s2, [s0, s1, s2].join('>'));
  const drag = async (from, to, hold = 0) => {
    const r = await sw.boundingBox(); const y = r.y + r.height / 2;
    await page.mouse.move(r.x + r.width * from, y); await page.mouse.down();
    await page.mouse.move(r.x + r.width * (from + to) / 2, y, { steps: 4 });
    await page.mouse.move(r.x + r.width * to, y, { steps: 4 });
    let g = null;
    if (hold) { await sleep(hold); g = await sw.evaluate((el) => { const a = getComputedStyle(el, '::after'); return { tx: new DOMMatrixReadOnly(a.transform).m41, w: parseFloat(a.width), left: parseFloat(a.left), pv: el.dataset.pv }; }); }
    await page.mouse.up(); await sleep(600);
    return g;
  };
  let before = await state();
  let g = await drag(before === 'true' ? 0.8 : 0.2, before === 'true' ? 0.05 : 0.95, 120);
  check('dragging the thumb across flips it', (await state()) !== before);
  check('the pressed thumb stays inside the track and the track takes the new colour while dragging', g && g.left + g.tx + g.w <= 51 - 2 + 0.5 && g.left + g.tx >= 2 - 0.5 && g.pv === (before === 'true' ? 'off' : 'on'), JSON.stringify(g));
  before = await state();
  await drag(before === 'true' ? 0.8 : 0.2, before === 'true' ? 0.66 : 0.34);
  check('a short drag springs back and changes nothing', (await state()) === before);
  before = await state();
  await drag(before === 'true' ? 0.8 : 0.2, before === 'true' ? 0.05 : 0.95);
  check('the click that ends a drag does not flip it a second time', (await state()) !== before);
  check('the thumb position is handed back to the stylesheet', await sw.evaluate((el) => el.style.getPropertyValue('--f') === ''));

  // ───────── 5. Toasts ─────────
  console.log('Toasts');
  await prep();
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('ca_timer_v1', JSON.stringify({ v: 1, id: 'e2e', status: 'running', level: 'inter', subject: 'Direct Tax (DT)', topic: 'Deductions 80C', startedAt: now - 47 * 60000, segments: [], runFrom: now - 47 * 60000 }));
  });
  await page.reload(); await page.waitForSelector('#root > :not(#boot)'); await sleep(1400);
  await go('overview', 800);
  await page.getByRole('button', { name: 'Stop and save' }).first().click(); await sleep(900);
  const toast = page.locator('.toast').first();
  const n0 = await page.locator('.toast').count();
  check('stopping the timer shows a toast', n0 >= 1);
  const tinfo = () => toast.evaluate((el) => ({ tf: getComputedStyle(el).transform, op: +getComputedStyle(el).opacity, drag: el.classList.contains('is-dragging') }));
  let tb = await toast.boundingBox();
  const tx = tb.x + tb.width * 0.3, ty = tb.y + tb.height / 2;
  await page.mouse.move(tx, ty); await page.mouse.down();
  await page.mouse.move(tx + 25, ty, { steps: 3 }); await sleep(40); await page.mouse.move(tx + 50, ty, { steps: 3 }); await sleep(160);
  const td = await tinfo();
  check('a toast follows the finger sideways and fades a little', td.drag && td.tf === 'matrix(1, 0, 0, 1, 50, 0)' && td.op < 1, JSON.stringify(td));
  await page.mouse.up(); await sleep(800);
  const tr = await tinfo();
  check('let go gently, it springs back', tr.tf === 'none' && tr.op === 1 && !tr.drag && (await page.locator('.toast').count()) === n0, JSON.stringify(tr));
  tb = await toast.boundingBox();
  await page.mouse.move(tb.x + tb.width * 0.3, tb.y + tb.height / 2); await page.mouse.down();
  await page.mouse.move(tb.x + tb.width * 0.3, tb.y + tb.height / 2 + 30, { steps: 2 });
  await page.mouse.move(tb.x + tb.width * 0.3, tb.y + tb.height / 2 + 140, { steps: 3 });
  await page.mouse.up(); await sleep(500);
  check('a flick down sends it away', (await page.locator('.toast').count()) === n0 - 1, String(await page.locator('.toast').count()));

  // ───────── 6. The classic fallback ─────────
  console.log('Classic interface');
  await prep({ ui: 'classic' });
  check('<html data-ui> says classic', (await page.evaluate(() => document.documentElement.dataset.ui)) === 'classic');
  await go('overview');
  await page.getByRole('button', { name: /Add hours/ }).first().click(); await sleep(700);
  const cs = await page.evaluate(() => { const m = document.querySelector('.modal'); return m && { grab: getComputedStyle(m.querySelector('.modal-grab')).display, radius: getComputedStyle(m).borderTopLeftRadius }; });
  check('the dialog is the classic card: no grabber', !!cs && cs.grab === 'none', JSON.stringify(cs));
  await page.keyboard.press('Escape'); await sleep(500);
  await go('manifest');
  await page.getByRole('button', { name: /^\s*Reset\s*$/ }).first().click(); await sleep(500);
  check('a confirm is the classic dialog, not an alert', (await page.locator('.ios-alert').count()) === 0 && (await page.locator('.modal').count()) === 1);
  await page.keyboard.press('Escape'); await sleep(500);
  check('the top bar has no glass layer', (await page.evaluate(() => getComputedStyle(document.querySelector('.topbar-glass')).display)) === 'none');
  await go('settings');
  const csw = page.locator('[role="switch"]').first(); await csw.scrollIntoViewIfNeeded();
  const c0 = await csw.getAttribute('aria-checked'); await csw.click(); await sleep(400);
  check('a switch still flips', (await csw.getAttribute('aria-checked')) !== c0);
  // Back to iOS from the Settings screen itself.
  await page.getByRole('button', { name: /^iOS$/ }).first().scrollIntoViewIfNeeded().catch(() => {});
  const iosBtn = page.getByRole('button', { name: /^iOS$/ }).first();
  if (await iosBtn.count()) { await iosBtn.click(); await sleep(500); check('the Interface control switches back to iOS at once', (await page.evaluate(() => document.documentElement.dataset.ui)) === 'ios'); }


  // ───────── 6b. Lanternfell, the school world ─────────
  console.log('Lanternfell');
  const academyStore = () => page.evaluate(() => JSON.parse(localStorage.getItem('ca_academy_v1') || 'null'));
  await prep({ world: 'academy' });
  check('<html data-world> says academy', (await page.evaluate(() => document.documentElement.dataset.world)) === 'academy');

  await go('overview', 1500);
  // The castle behind the app is painted into the wallpaper canvas, so it costs no layer of its own. Look at the canvas pixels: the castle (low on the menu side) is full of
  // edges and lit windows, everything else is a smooth gradient with grain. "Detail" is the 95th percentile of the spread of brightness inside 8 x 8 blocks: a smooth gradient
  // and grain stay low in every block, an edge or a window sends some blocks high.
  const skyStat = () => page.evaluate(() => {
    // copy the sky into a scratch canvas made for reading, so the test does not make the sky's own canvas complain about read-backs
    const c = document.querySelector('.bg canvas.sky'); const W = c.width, H = c.height;
    const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
    const g = scratch.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0);
    const detail = (x0, y0, x1, y1) => {
      const X0 = Math.round(W * x0), Y0 = Math.round(H * y0), w = Math.round(W * (x1 - x0)), h = Math.round(H * (y1 - y0)); const d = g.getImageData(X0, Y0, w, h).data; const sds = [];
      for (let by = 0; by + 8 <= h; by += 8) for (let bx = 0; bx + 8 <= w; bx += 8) {
        let a = 0, b = 0, n = 0;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = ((by + y) * w + bx + x) * 4; const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; a += l; b += l * l; n++; }
        const m = a / n; sds.push(Math.sqrt(Math.max(0, b / n - m * m)));
      }
      sds.sort((p, q) => p - q); return +sds[Math.floor(sds.length * 0.95)].toFixed(2);
    };
    return { castle: detail(0, 0.5, 0.2, 0.8), quiet: detail(0.55, 0.3, 0.75, 0.5) };
  });
  const sky1 = await skyStat();
  check('the castle is painted into the wallpaper canvas, low on the menu side, with no layer of its own', sky1.castle > 7 && sky1.quiet < 4 && (await page.locator('.ab-scene').count()) === 0, JSON.stringify(sky1));
  check('nothing drifts behind the app: the wallpaper is one canvas, with no mist or fireflies in front of the castle', (await page.locator('.bg').evaluate((el) => el.children.length)) === 1 && (await page.locator('.ab-mist, .ab-ff').count()) === 0);
  const card = await page.evaluate(() => { const c = document.querySelector('.axcard'); return c && { title: c.querySelector('.ax-title')?.textContent || '', parts: c.querySelectorAll('.ax-scene svg *').length, face: !!c.querySelector('.ax-say svg') }; });
  check('the Atrium shows the school card: the castle drawn in detail, the Headmistress and a headline', !!card && card.parts > 150 && card.face && /school is behind you|Charter is yours/.test(card.title), JSON.stringify(card));
  check('with no house yet, the card offers the Choosing', (await page.getByRole('button', { name: /Be chosen for a house/ }).count()) > 0);

  await go('grounds', 1800);
  const gr = await page.evaluate(() => {
    const stage = document.querySelector('.gm-stage'); const n = +((stage?.getAttribute('aria-label') || '').match(/with (\d+) buildings/)?.[1] ?? -1);
    const bs = [...document.querySelectorAll('.gm-b')];
    const art = bs.map((b) => { const sv = b.querySelector('.gm-art svg'); const r = sv.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), parts: sv.querySelectorAll('*').length }; });
    return { title: document.querySelector('.gr-title')?.textContent, n, count: bs.length, buttons: document.querySelectorAll('.gm-b .gm-hit').length, tiny: art.filter((a) => a.w < 40 || a.h < 40).length, thin: art.filter((a) => a.parts < 60).length, least: Math.min(...art.map((a) => a.parts)) };
  });
  check('the Grounds opens with one building for every paper, each a real drawing and each a button', gr.title === 'The Grounds' && gr.n > 0 && gr.n === gr.count && gr.buttons === gr.count && gr.tiny === 0 && gr.thin === 0, JSON.stringify(gr));

  await page.locator('.gm-hit').first().click(); await sleep(800);
  const bp = await page.evaluate(() => ({ panel: !!document.querySelector('.gr-bp'), name: document.querySelector('.gr-bp h3')?.textContent || '', selected: document.querySelectorAll('.gm-b.is-selected').length, parts: document.querySelectorAll('.gr-bp-art svg *').length }));
  check('picking a building opens its panel with a close-up drawing', bp.panel && bp.name.length > 0 && bp.selected === 1 && bp.parts > 60, JSON.stringify(bp));
  await page.locator('.gm-hit').nth(1).click(); await sleep(600);
  const bp2 = await page.evaluate(() => ({ name: document.querySelector('.gr-bp h3')?.textContent || '', selected: document.querySelectorAll('.gm-b.is-selected').length }));
  check('picking another building moves the selection and the panel', bp2.selected === 1 && bp2.name !== bp.name && bp2.name.length > 0, JSON.stringify(bp2));

  // The Choosing: leave once, then do it properly with the keyboard and the mouse.
  await page.getByRole('button', { name: /Begin the Choosing/ }).first().click(); await sleep(1000);
  check('the Choosing opens as a dialog, with the Headmistress drawn in it', (await page.locator('.cho[role="dialog"]').count()) === 1 && (await page.locator('.cho-speaker svg').count()) === 1);
  await page.keyboard.press('Escape'); await sleep(800);
  check('Escape leaves it and nothing is saved', (await page.locator('.cho').count()) === 0 && !(await academyStore())?.house);
  await page.getByRole('button', { name: /Begin the Choosing/ }).first().click(); await sleep(1000);
  await page.getByRole('button', { name: /^Begin$/ }).click(); await sleep(600);
  const asks = [];
  for (let q = 0; q < 3; q++) {
    asks.push(await page.locator('.cho-kicker').first().textContent());
    if (q === 1) await page.keyboard.press('1'); else await page.locator('.cho-ans').first().click();
    await sleep(900);
  }
  check('three questions are asked in turn (a number key answers too)', asks.join('|') === 'Question 1 of 3|Question 2 of 3|Question 3 of 3', asks.join('|'));
  await page.waitForSelector('.cho.is-house', { timeout: 6000 });
  const reveal = await page.evaluate(() => ({ house: document.querySelector('.cho-house')?.textContent || '', crest: document.querySelectorAll('.cho-crest svg *').length, bars: document.querySelectorAll('.cho-bars li').length, join: [...document.querySelectorAll('.cho-btn--house')].map((b) => b.textContent).join('') }));
  check('the lantern names a house: crest, four virtue bars and a Join button', reveal.house.length > 3 && reveal.crest > 60 && reveal.bars === 4 && reveal.join.startsWith('Join '), JSON.stringify(reveal));
  await page.locator('.cho-btn--house').click(); await sleep(1500);
  const chosen = await academyStore();
  check('joining stores the house, the day, the three answers and the virtues, and closes the dialog', !!chosen && ['wolf', 'heron', 'fox', 'bear'].includes(chosen.house) && /^\d{4}-\d\d-\d\d$/.test(chosen.chosenOn) && chosen.answers.every((a) => a === 0) && !!chosen.virtues && (await page.locator('.cho').count()) === 0, JSON.stringify(chosen));
  // The celebration is a card that stays a few seconds and is dismissed with "Nice!"; the next one waits its turn behind it.
  const said = (re) => page.waitForFunction((src) => { const t = document.querySelector('.cel-title')?.textContent || ''; return new RegExp(src).test(t) ? t : false; }, re.source, { timeout: 9000 }).then((h) => h.jsonValue()).catch(() => '');
  const joinCel = await said(/is your house/);
  check('joining is celebrated, with the house named', /is your house/.test(joinCel), joinCel);
  await page.locator('.cel-ok').click().catch(() => {}); await sleep(900);
  const after = await page.evaluate(() => ({ prompt: document.querySelectorAll('.gr-prompt').length, sub: document.querySelector('.gr-sub')?.textContent || '', wells: document.querySelectorAll('.gr-well').length, yours: document.querySelectorAll('.gr-well.is-yours').length }));
  check('the page now shows your house: no prompt, four wells, exactly one of them yours', after.prompt === 0 && after.wells === 4 && after.yours === 1 && after.sub.split(' · ').length === 3, JSON.stringify(after));
  check('being chosen again has to wait a term', (await page.getByRole('button', { name: /Be chosen again/ }).count()) === 0 && /Next Choosing from/.test(await page.locator('.gr-houses').textContent()));

  // A backup carries the house, and restoring one changes it at once (the school keeps its state in memory, so a restore has to tell it).
  await go('settings', 600);
  await page.reload(); await page.waitForSelector('#root > :not(#boot)'); await sleep(1200); // Settings, freshly loaded: the school's own store is not even loaded
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: /^\s*Download\s*$/ }).first().click();
  const file = await (await dl).path();
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  const savedHouse = JSON.parse(backup.storage?.ca_academy_v1 || 'null')?.house;
  check('a backup file carries the house', savedHouse === chosen.house, String(savedHouse));
  const otherHouse = ['wolf', 'heron', 'fox', 'bear'].find((h) => h !== chosen.house);
  backup.storage.ca_academy_v1 = JSON.stringify({ ...JSON.parse(backup.storage.ca_academy_v1), house: otherHouse });
  const edited = join(mkdtempSync(join(tmpdir(), 'ca-restore-')), 'backup.json');
  writeFileSync(edited, JSON.stringify(backup));
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(edited); await sleep(900);
  await page.getByRole('button', { name: /^\s*Merge in/ }).click(); await sleep(1200);
  const restored = await page.evaluate(() => ({ stored: JSON.parse(localStorage.getItem('ca_academy_v1') || 'null')?.house, shown: document.documentElement.dataset.house }));
  check('restoring a backup puts its house in place at once, in storage and on screen (even on a screen that never loaded the school)', restored.stored === otherHouse && restored.shown === otherHouse, JSON.stringify({ ...restored, wanted: otherHouse }));
  await page.evaluate(([h]) => { const a = JSON.parse(localStorage.getItem('ca_academy_v1')); a.house = h; localStorage.setItem('ca_academy_v1', JSON.stringify(a)); }, [chosen.house]);
  await page.reload(); await page.waitForSelector('#root > :not(#boot)'); await sleep(900);

  // Marking a year as cleared is the student's own act, asked about first, and can be undone.
  await go('grounds', 900);
  const clearBtn = page.getByRole('button', { name: /I cleared/ }).first();
  await clearBtn.scrollIntoViewIfNeeded(); await clearBtn.click(); await sleep(600);
  check('"I cleared this year" asks first', (await page.locator('.ios-alert').count()) === 1);
  await page.locator('.ios-alert-actions button').first().click(); await sleep(500);
  check('Cancel changes nothing', Object.keys((await academyStore()).cleared).length === 0);
  await clearBtn.click(); await sleep(600);
  await page.locator('.ios-alert-actions button').nth(1).click(); await sleep(1500);
  const cleared = (await academyStore()).cleared;
  check('confirming marks the year cleared, with today as the day', Object.keys(cleared).length === 1 && /^\d{4}-\d\d-\d\d$/.test(Object.values(cleared)[0]), JSON.stringify(cleared));
  const clearedCel = await said(/cleared/);
  check('a celebration marks it', /cleared/.test(clearedCel), clearedCel);
  await page.locator('.cel-ok').click().catch(() => {}); await sleep(900);
  check('"Nice!" dismisses it', (await page.locator('.cel-card').count()) === 0);
  const undo = page.getByRole('button', { name: /^\s*Undo\s*$/ }).first();
  check('and offers Undo', (await undo.count()) === 1);
  await undo.click(); await sleep(600);
  check('Undo opens the year again', Object.keys((await academyStore()).cleared).length === 0);

  // The last year plays Charter Night.
  await page.evaluate(() => { localStorage.setItem('ca_level_selected', 'final'); });
  await page.reload(); await page.waitForSelector('#root > :not(#boot)'); await sleep(900);
  await go('grounds', 1500);
  const finalBtn = page.getByRole('button', { name: /I cleared CA Final/ }).first();
  await finalBtn.scrollIntoViewIfNeeded(); await finalBtn.click(); await sleep(600);
  await page.locator('.ios-alert-actions button').nth(1).click(); await sleep(2200);
  const night = await page.evaluate(() => ({ dlg: !!document.querySelector('.cn[role="dialog"]'), title: document.querySelector('.cn-title')?.textContent, lanterns: document.querySelectorAll('.cn-lan').length, cast: document.querySelectorAll('.cn-pal svg').length, record: [...document.querySelectorAll('.cn-acts button')].some((b) => /School record/.test(b.textContent)) }));
  check('clearing CA Final plays Charter Night: rising lanterns, all four teachers and you, and a school record button', night.dlg && night.title === 'Charter Night' && night.lanterns === 28 && night.cast >= 5 && night.record, JSON.stringify(night));
  await page.keyboard.press('Escape'); await sleep(900);
  check('Escape ends the night', (await page.locator('.cn').count()) === 0);
  await page.evaluate(() => { localStorage.setItem('ca_level_selected', 'inter'); localStorage.removeItem('ca_academy_v1'); });
  await page.reload(); await page.waitForSelector('#root > :not(#boot)'); await sleep(900);

  // The picker in Settings shows all three worlds, each with a real drawing, and goes back to the everyday look in one tap.
  await go('settings', 1200);
  const picker = await page.evaluate(() => ({ cards: document.querySelectorAll('.wp-card').length, on: [...document.querySelectorAll('.wp-card')].filter((c) => c.getAttribute('aria-checked') === 'true').map((c) => c.className.match(/wp-card--(\w+)/)[1]), art: [...document.querySelectorAll('.wp-card .wp-art')].map((a) => a.querySelectorAll('svg *').length) }));
  check('Settings offers the three worlds, Lanternfell is the one in use, and each card holds a real drawing', picker.cards === 3 && picker.on.join() === 'academy' && picker.art.every((n) => n > 40), JSON.stringify(picker));
  await page.locator('.wp-card--default').scrollIntoViewIfNeeded(); await page.locator('.wp-card--default').click(); await sleep(1500);
  await sleep(600);
  const sky2 = await skyStat();
  check('and the castle leaves the wallpaper with it', sky2.castle < 4, JSON.stringify({ was: sky1.castle, now: sky2.castle }));
  check('one tap on Everyday brings the everyday look back, and the data is untouched', (await page.evaluate(() => document.documentElement.dataset.world)) === 'default' && (await page.evaluate(() => JSON.parse(localStorage.getItem('ca_study_logs_v4_inter') || '[]').length)) > 0);

  // ───────── 6c. v8: the wallpaper, the glass and the motion ─────────
  console.log('Wallpaper, glass and motion');
  {
  await prep();
  await go('overview', 1500);
  const hexOfRgb = (c) => { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c); return m ? '#' + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, '0')).join('') : ''; };
  const wp = await page.evaluate(() => {
    const bg = document.querySelector('.bg'), cv = bg.querySelector('canvas.sky'), cs = getComputedStyle(document.documentElement);
    return { ready: bg.getAttribute('data-sky') === 'on' && cv.classList.contains('is-ready'), kids: bg.children.length, top: cs.getPropertyValue('--wp-top').trim(), name: cs.getPropertyValue('--wp-name').trim(), theme: document.querySelector('meta[name="theme-color"]').getAttribute('content') };
  });
  check('the wallpaper is one painted canvas, and its colours and its name are on <html>', wp.ready && wp.kids === 1 && /^rgb\(/.test(wp.top) && /^"/.test(wp.name), JSON.stringify(wp));
  check('the browser\'s theme colour is the top of the sky', hexOfRgb(wp.top) === wp.theme, JSON.stringify({ top: wp.top, theme: wp.theme }));

  const sb = await page.evaluate(() => { const el = document.querySelector('.sidebar'), r = el.getBoundingClientRect(), c = getComputedStyle(el); return { l: r.left, t: r.top, h: r.height, vh: innerHeight, radius: c.borderTopLeftRadius, blur: c.backdropFilter, fill: c.backgroundColor }; });
  check('the sidebar is edge to edge: flush with the left, top and bottom of the screen, square-cornered and not blurred', sb.l === 0 && sb.t === 0 && near(sb.h, sb.vh, 1) && sb.radius === '0px' && (sb.blur === 'none' || sb.blur === ''), JSON.stringify(sb));

  const cards = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.card')];
    const icon = document.querySelector('.stat-icon');
    return { n: all.length, flat: all.every((c) => getComputedStyle(c).backgroundImage === 'none'), tinted: all.every((c) => /^rgba\(/.test(getComputedStyle(c).backgroundColor)), icon: icon ? getComputedStyle(icon).backgroundColor + ' / ' + getComputedStyle(icon).borderTopWidth : null };
  });
  check('every card is matte: a flat tinted fill, no gradient wash', cards.n > 4 && cards.flat && cards.tinted, JSON.stringify(cards));
  check('stat icons are plain symbols, not coloured boxes', cards.icon === null || /^rgba\(0, 0, 0, 0\) \/ 0px$/.test(cards.icon), String(cards.icon));
  const loops = await page.evaluate(() => ({
    radar: document.querySelector('.radar') ? getComputedStyle(document.querySelector('.radar')).animationName : 'none',
    aura: document.querySelector('.cta-aura') ? getComputedStyle(document.querySelector('.cta-aura')).display : 'none',
  }));
  check('the floating dial and the halo behind the main button are gone from the Overview', loops.radar === 'none' && loops.aura === 'none', JSON.stringify(loops));

  await go('log', 1300); await page.evaluate(() => scrollTo(0, 400)); await sleep(500);
  const tb = await page.evaluate(() => { const g = document.querySelector('.topbar-glass'), bar = document.querySelector('.topbar'), cs = getComputedStyle(g); return { op: +cs.opacity, glassH: g.getBoundingClientRect().height, barH: bar.getBoundingClientRect().height, mask: cs.maskImage || cs.webkitMaskImage || '', blur: cs.backdropFilter || '' }; });
  check('scrolled, the top bar is glass whose lower edge fades into the page: it reaches below the bar, is masked and blurs', tb.op === 1 && tb.glassH > tb.barH + 10 && /gradient/.test(tb.mask) && /blur/.test(tb.blur), JSON.stringify(tb));
  const pill = await page.evaluate(() => { const el = document.querySelector('.topbar .icon-btn'); const c = getComputedStyle(el); return { blur: c.backdropFilter, fill: c.backgroundColor, rim: /inset/.test(c.boxShadow) }; });
  check('the buttons in the bar are small tinted pieces of glass with a lit rim', /^rgba\(/.test(pill.fill) && pill.rim, JSON.stringify(pill));
  // A blur laid over a blur is the most expensive thing glass can ask of the browser, so the bar's own glass is the only blur in the bar.
  const barBlurs = await page.evaluate(() => [...document.querySelectorAll('.topbar, .topbar *')].filter((e) => { const c = getComputedStyle(e); return c.backdropFilter !== 'none' && c.backdropFilter !== ''; }).map((e) => e.className));
  check('the bar is one blur, not a blur under each button', barBlurs.length === 1 && /topbar-glass/.test(String(barBlurs[0])), JSON.stringify(barBlurs));
  await page.evaluate(() => scrollTo(0, 0)); await sleep(300);

  // The light under a finger: it is put on the control that is pressed, follows the finger, and fades when it lifts.
  const btn = page.locator('.topbar .icon-btn').first(); const bb = await btn.boundingBox();
  await page.mouse.move(bb.x + 8, bb.y + 8); await page.mouse.down(); await sleep(160);
  const lit1 = await btn.evaluate((el) => ({ lit: el.hasAttribute('data-lit'), gx: el.style.getPropertyValue('--gx'), gy: el.style.getPropertyValue('--gy'), gl: getComputedStyle(el).getPropertyValue('--gl').trim() }));
  await page.mouse.move(bb.x + bb.width - 8, bb.y + bb.height - 8, { steps: 4 }); await sleep(60);
  const lit2 = await btn.evaluate((el) => ({ gx: el.style.getPropertyValue('--gx'), gy: el.style.getPropertyValue('--gy') }));
  await page.mouse.move(bb.x + bb.width + 120, bb.y + 200); await page.mouse.up(); await sleep(900);
  const lit3 = await btn.evaluate((el) => ({ lit: el.hasAttribute('data-lit'), gl: getComputedStyle(el).getPropertyValue('--gl').trim() }));
  check('pressing a control puts the light under the finger (its place is on the control) and brings it up', lit1.lit && lit1.gx === '8px' && lit1.gy === '8px' && +lit1.gl > 0.5, JSON.stringify(lit1));
  check('the light follows the finger across the control', lit2.gx !== lit1.gx && lit2.gy !== lit1.gy, JSON.stringify({ from: lit1, to: lit2 }));
  check('letting go lets the light fade away', !lit3.lit && +lit3.gl < 0.05, JSON.stringify(lit3));

  // Moving between screens (here by the menu, the way a person does it): a fade up out of a slightly smaller size, with no sideways slide. A screen is a separate piece
  // of code the first time it is opened, so the arrival starts when that has loaded.
  const arrival = async () => {
    await page.waitForFunction(() => document.getAnimations().some((x) => x.animationName === 'ios-page-in'), null, { timeout: 4000 }).catch(() => {});
    return page.evaluate(() => {
      const a = document.getAnimations().find((x) => x.animationName === 'ios-page-in');
      const kf = a ? a.effect.getKeyframes()[0] : null;
      return { name: a ? a.animationName : null, from: kf ? String(kf.transform) : null, opacity: kf ? kf.opacity : null };
    });
  };
  await go('overview', 1200);
  await page.locator('.sidebar .nav-item', { hasText: 'Insights' }).first().click();
  const pg = await arrival();
  check('a new screen fades up out of a slightly smaller size: no sideways slide', pg.name === 'ios-page-in' && /^translate3d\(0px, /.test(pg.from || '') && /scale\(0\.98/.test(pg.from || '') && +pg.opacity === 0, JSON.stringify(pg));
  await sleep(900);
  // Also when the address changes under the app (a link, the back button): the same arrival.
  await page.evaluate(() => { location.hash = '#/log'; });
  const pg2 = await arrival();
  check('and the same when the address changes without the menu', pg2.name === 'ios-page-in', JSON.stringify(pg2));
  await sleep(900);

  // The cards of a screen arrive close together: 22 ms apart.
  await go('mock-analysis', 1100);
  const st = await page.evaluate(() => { const el = [...document.querySelectorAll('.stagger')].find((e) => e.children.length >= 3); if (!el) return null; return [0, 1, 2].map((n) => getComputedStyle(el.children[n]).animationDelay); });
  check('the cards of a screen arrive 22 ms apart', !!st && st[0] === '0s' && st[1] === '0.022s' && st[2] === '0.044s', JSON.stringify(st));

  // A sheet on a wide screen springs up out of the control that was pressed.
  await go('overview', 1200);
  const add = page.getByRole('button', { name: /Add hours/ }).first(); const ab = await add.boundingBox();
  await add.click(); await sleep(60);
  const pop = await page.evaluate(() => { const m = document.querySelector('.modal'); if (!m) return null; const cs = getComputedStyle(m); return { anim: cs.animationName.split(',')[0].trim(), blur: cs.backdropFilter, fx: m.style.getPropertyValue('--from-x'), fy: m.style.getPropertyValue('--from-y') }; });
  // Loops that repeat for ever and are not part of an overlay: the mascot breathing, the radar, the flame...
  const loopsBehind = () => page.evaluate(() => document.getAnimations().filter((a) => { const fx = a.effect; const t = fx && fx.target; return a.playState === 'running' && fx && fx.getTiming().iterations === Infinity && !(t && t.closest && t.closest('.scrim, .ios-alert-scrim, .toasts')); }).length);
  await sleep(900);
  const popEnd = await page.evaluate(() => { const m = document.querySelector('.modal'); const cs = getComputedStyle(m); return { op: +cs.opacity, tf: cs.transform, blur: cs.backdropFilter, held: document.documentElement.hasAttribute('data-sheet') }; });
  const stillWhileOpen = await loopsBehind();
  const side = Math.sign(ab.x + ab.width / 2 - 1472 / 2), fxN = parseFloat(pop && pop.fx), fyN = parseFloat(pop && pop.fy);
  check('a sheet springs up out of the button that opened it (it leans towards that button)', !!pop && pop.anim === 'ios-pop-in' && Number.isFinite(fxN) && Number.isFinite(fyN) && Math.sign(fxN) === side && Math.sign(fyN) === Math.sign(ab.y + ab.height / 2 - 920 / 2), JSON.stringify({ pop, side }));
  check('and settles square and fully visible', popEnd.op === 1 && (popEnd.tf === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(popEnd.tf)), JSON.stringify(popEnd));
  check('a sheet is blurred only when it is at rest: none while it moves, glass once it has landed', pop.blur === 'none' && /blur/.test(popEnd.blur), JSON.stringify({ moving: pop.blur, atRest: popEnd.blur }));
  check('the page behind an open sheet stands still: its loops are paused, so the glass is not redrawn for nothing', popEnd.held && stillWhileOpen === 0, JSON.stringify({ held: popEnd.held, loops: stillWhileOpen }));
  await page.keyboard.press('Escape'); await sleep(700);
  const afterClose = { held: await page.evaluate(() => document.documentElement.hasAttribute('data-sheet')), loops: await loopsBehind() };
  check('and they carry on when the sheet has gone', !afterClose.held && afterClose.loops > 0, JSON.stringify(afterClose));

  // Settings: how clear the glass is, and which wallpaper Everyday has.
  await go('settings', 1300);
  const glassK = () => page.evaluate(() => document.documentElement.style.getPropertyValue('--glass-k'));
  const savedGlass = () => page.evaluate(() => JSON.parse(localStorage.getItem('ca_settings_v3') || '{}').glass);
  const sbAlpha = () => page.evaluate(() => { const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(document.querySelector('.sidebar')).backgroundColor); const p = m[1].split(',').map(Number); return p.length > 3 ? p[3] : 1; });
  const slider = page.getByRole('slider', { name: /Glass/ });
  check('Settings has a Glass slider from Clear to Tinted, resting at the usual 55', (await slider.count()) === 1 && (await slider.inputValue()) === '55' && (await glassK()).trim() === '0.55');
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('0'); await sleep(150);
  const aClear = await sbAlpha();
  check('moving the slider changes the glass at once, before anything has been saved', (await glassK()).trim() === '0.00' && (await savedGlass()) === undefined);
  await sleep(600);
  check('the setting is saved a moment after the slider stops', (await savedGlass()) === 0);
  await slider.fill('100'); await sleep(700);
  const aTint = await sbAlpha();
  check('tinted glass is deeper than clear glass: the sidebar fill gets more opaque', aClear < 0.4 && aTint > 0.75 && aTint > aClear + 0.4, JSON.stringify({ clear: aClear, tinted: aTint }));
  await page.reload(); await page.waitForSelector('#root > :not(#boot)'); await sleep(800);
  check('the glass is the same after a reload (it is set before the first screen draws)', (await glassK()).trim() === '1.00' && (await savedGlass()) === 100);
  await go('settings', 1300);
  const back = page.getByRole('button', { name: /Back to the usual/ });
  await back.scrollIntoViewIfNeeded(); await back.click(); await sleep(700);
  check('Back to the usual puts it back to 55 and the button goes', (await glassK()).trim() === '0.55' && (await savedGlass()) === 55 && (await back.count()) === 0);

  const wallName = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--wp-name').trim());
  await page.getByRole('button', { name: /^Night$/ }).scrollIntoViewIfNeeded(); await page.getByRole('button', { name: /^Night$/ }).click(); await sleep(1600);
  check('choosing Night pins Everyday to the night sky', (await page.evaluate(() => document.documentElement.getAttribute('data-wallpaper'))) === 'night' && (await wallName()) === '"Night"' && (await page.evaluate(() => JSON.parse(localStorage.getItem('ca_settings_v3')).wallpaper)) === 'night');
  await page.getByRole('button', { name: /^Follows the day$/ }).click(); await sleep(1600);
  check('Follows the day lets the hour choose again', (await page.evaluate(() => document.documentElement.getAttribute('data-wallpaper'))) === null && (await page.evaluate(() => JSON.parse(localStorage.getItem('ca_settings_v3')).wallpaper)) === 'day');

  // The story worlds keep their own wallpaper, and their pages have no Wallpaper switch.
  await prep({ world: 'voyage' }); await go('settings', 1300);
  const seaSky = await page.evaluate(() => ({ name: getComputedStyle(document.documentElement).getPropertyValue('--wp-name').trim(), night: document.documentElement.getAttribute('data-wallpaper') }));
  check('the Ledger Seas have their own wallpaper: the sea at night', seaSky.name === '"Night at sea"' && seaSky.night === null, JSON.stringify(seaSky));
  check('and Settings explains that there instead of offering the Night switch', (await page.getByRole('button', { name: /^Night$/ }).count()) === 0 && (await page.getByText(/keep their own night sea/).count()) === 1);
  await prep({ world: 'default' });

  // With the classic interface the glass slider has nothing to do, so it is not offered; the matte cards and the wallpaper are shared.
  await prep({ ui: 'classic' }); await go('settings', 1300);
  check('the classic interface has no Glass slider, but has the same wallpaper and matte cards', (await page.getByRole('slider', { name: /Glass/ }).count()) === 0 && (await page.evaluate(() => getComputedStyle(document.querySelector('.card')).backgroundImage)) === 'none' && (await page.evaluate(() => document.querySelector('.bg').getAttribute('data-sky'))) === 'on');
  await prep();
  }

  // ───────── 7. Layout scan: no sideways scrolling, no console errors, in every look and size ─────────
  console.log('Layout scan' + (full ? ' (every screen)' : ' (quick)'));
  const sizes = [[1472, 920], [820, 1180], [390, 844]];
  const routes = full ? ROUTES : QUICK;
  const bad = [];
  for (const world of ['default', 'voyage', 'academy']) {
    for (const ui of ['ios', 'classic']) {
      await page.setViewportSize({ width: 1472, height: 920 });
      await prep({ ui, world });
      for (const [w, h] of sizes) {
        await page.setViewportSize({ width: w, height: h }); await sleep(250);
        for (const r of routes) {
          await go(r, 650);
          const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
          if (o.sw > o.cw + 1) bad.push(`${world}/${ui} ${w}px ${r}: ${o.sw} > ${o.cw}`);
        }
      }
    }
  }
  check('no screen scrolls sideways in any of the three worlds, either interface, at desktop, tablet and phone widths', bad.length === 0, bad.join('\n      '));

  check('no console errors or warnings from the whole run', errors.length === 0, errors.join('\n      '));
});

console.log(`\n${passed} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
