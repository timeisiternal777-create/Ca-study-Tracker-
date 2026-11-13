// Frame-rate meter. Opens every screen at each motion level and records how steadily the browser can draw frames while nothing is touched.
//
//   node scripts/fps.mjs                       all screens, full / calm / still
//   node scripts/fps.mjs --levels=full --tabs=DASHBOARD,LOG --ms=4000 --w=1472 --h=920
//   node scripts/fps.mjs --timer                also measures the dashboard with the study timer running
//   node scripts/fps.mjs --world=voyage         the same, in the optional Voyage world (adds the Sea chart)
//   node scripts/fps.mjs --world=academy        the same, in Lanternfell (adds the Grounds, with a house chosen)
//
// The browser here draws in software at 60 Hz, which is much slower than a tablet's GPU, so a pass here is a pessimistic proxy: if it
// holds 55 fps or more here, a real device holds its full refresh rate. Exit code 1 if any screen at `full` falls under the bar.
import { pathToFileURL } from 'node:url';
import { withApp } from './snap.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return [m[1], m[2] ?? true]; }));
const LEVELS = String(args.levels || 'full,calm,still').split(',');
const WORLD = args.world === 'voyage' || args.world === 'academy' ? args.world : 'default';
const TABS = String(args.tabs || `DASHBOARD,${WORLD === 'voyage' ? 'VOYAGE,' : WORLD === 'academy' ? 'GROUNDS,' : ''}LOG,MOCK,MOCK_DASHBOARD,TARGET_ANALYSIS,CHARTS,WEEKLY,SUBJECTS,TARGETS,GAMIFICATION,MANIFESTATION,SETTINGS`).split(',');
const MS = +args.ms || 3000;
const BAR = +args.bar || 55;

const probe = (ms) => new Promise((resolve) => {
  const gaps = []; let last = 0; const t0 = performance.now();
  const step = (now) => {
    if (last) gaps.push(now - last);
    last = now;
    if (now - t0 < ms) requestAnimationFrame(step);
    else {
      const g = gaps.filter((x) => x < 250).sort((a, b) => a - b);
      const q = (p) => g[Math.min(g.length - 1, Math.floor(g.length * p))];
      const anims = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length;
      const mean = g.reduce((a, b) => a + b, 0) / Math.max(1, g.length);
      resolve({ n: g.length, median: q(0.5), p90: q(0.9), p99: q(0.99), max: g[g.length - 1], fps: 1000 / mean, slow: g.filter((x) => x > 25).length, loops: anims });
    }
  };
  requestAnimationFrame(step);
});

export async function measure({ page, app }, level, tab, ms = MS) {
  await app.goto(tab);
  await page.evaluate(([lv, world]) => {
    const s = JSON.parse(localStorage.getItem('ca_settings_v3') || '{}');
    // Still is what the app switches to for someone who asks for reduced motion, so measure it the way it really starts: loaded in that state.
    s.motionLevel = lv === 'still' ? 'calm' : lv; s.reduceMotion = lv === 'still'; s.worldTheme = world;
    localStorage.setItem('ca_settings_v3', JSON.stringify(s));
    localStorage.setItem('ca_assistant_v1', JSON.stringify({ welcomed: true }));
    // Lanternfell is measured with a house already chosen, so the banner, the crest and the wells are all on screen.
    if (world === 'academy') localStorage.setItem('ca_academy_v1', JSON.stringify({ v: 1, house: 'fox', chosenOn: '2026-09-01', answers: [0, 0, 0], virtues: { grit: 55, care: 40, wit: 62, steadiness: 48 } }));
  }, [level, WORLD]);
  await page.reload();
  await page.waitForSelector('#root > :not(#boot)');
  await page.waitForTimeout(2200);
  await page.waitForTimeout(300);
  const motion = await page.evaluate(() => document.documentElement.dataset.motion);
  const r = await page.evaluate(probe, ms);
  return { level, tab, motion, ...r };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = [];
  await withApp({ w: +args.w || 1472, h: +args.h || 920, dpr: +args.dpr || 1 }, async (ctx) => {
    for (const level of LEVELS) {
      for (const tab of TABS) {
        const r = await measure(ctx, level, tab);
        rows.push(r);
        console.log(`${r.motion.padEnd(5)} ${tab.padEnd(15)} fps ${r.fps.toFixed(1).padStart(5)}  median ${r.median.toFixed(1)}ms  p90 ${r.p90.toFixed(1)}ms  p99 ${r.p99.toFixed(1)}ms  slow ${String(r.slow).padStart(3)}/${r.n}  loops ${r.loops}`);
      }
    }
    if (args.timer) {
      await ctx.page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ca_settings_v3') || '{}'); s.motionLevel = 'full'; localStorage.setItem('ca_settings_v3', JSON.stringify(s)); });
      await ctx.app.goto('DASHBOARD');
      await ctx.page.reload(); await ctx.page.waitForSelector('#root > :not(#boot)'); await ctx.page.waitForTimeout(1500);
      await ctx.page.locator('.tcard-chips .chip').first().click();
      await ctx.page.waitForTimeout(2000);
      const r = await ctx.page.evaluate(probe, MS);
      rows.push({ level: 'full', tab: 'DASHBOARD+timer', ...r });
      console.log(`full  DASHBOARD+timer fps ${r.fps.toFixed(1).padStart(5)}  median ${r.median.toFixed(1)}ms  p90 ${r.p90.toFixed(1)}ms  p99 ${r.p99.toFixed(1)}ms  slow ${r.slow}/${r.n}  loops ${r.loops}`);
      await ctx.page.locator('.tpill-main').click();
      await ctx.page.waitForTimeout(1500);
      const f = await ctx.page.evaluate(probe, MS);
      rows.push({ level: 'full', tab: 'FOCUS', ...f });
      console.log(`full  FOCUS           fps ${f.fps.toFixed(1).padStart(5)}  median ${f.median.toFixed(1)}ms  p90 ${f.p90.toFixed(1)}ms  p99 ${f.p99.toFixed(1)}ms  slow ${f.slow}/${f.n}  loops ${f.loops}`);
    }
  });
  const bad = rows.filter((r) => r.level === 'full' && r.fps < BAR);
  console.log(bad.length ? `\n${bad.length} screen(s) under ${BAR} fps at full: ${bad.map((r) => r.tab).join(', ')}` : `\nEvery screen holds ${BAR} fps or more at full.`);
  process.exitCode = bad.length ? 1 : 0;
}
