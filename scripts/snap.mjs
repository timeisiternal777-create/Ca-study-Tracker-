// Screenshot / test harness. Builds the app, serves it, opens it with Playwright and seeds localStorage.
//
//   node scripts/snap.mjs --tab=LOG --w=1472 --h=920 --out=/tmp/log.png
//   node scripts/snap.mjs --tab=DASHBOARD --seed=none          (first-run experience)
//   node scripts/snap.mjs --script=my-test.mjs                 (custom: export default async ({page, app, errors}) => {...})
//
// Programmatic: import { withApp } from './snap.mjs'
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';
import { startServer } from './serve.mjs';
import { buildSeed } from './seed.mjs';

const require = createRequire(import.meta.url);
const TAB_SLUG = {
  DASHBOARD: 'overview', LOG: 'log', MOCK: 'mock', MOCK_DASHBOARD: 'mock-analysis', GAMIFICATION: 'rewards', WEEKLY: 'heatmap',
  CHARTS: 'analytics', SUBJECTS: 'subjects', TARGETS: 'targets', TARGET_ANALYSIS: 'plan', MANIFESTATION: 'manifest', SETTINGS: 'settings', VOYAGE: 'sea', GROUNDS: 'grounds',
};

export async function withApp(opts, fn) {
  const { w = 1472, h = 920, seed = 'demo', level = 'inter', dpr = 1, reuseBuild, storage = {}, reducedMotion = false } = opts;
  const { chromium } = require('playwright');
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'ca-snap-'));
  const outdir = reuseBuild || path.join(tmp, 'dist');
  if (!reuseBuild) await build({ outdir, quiet: true });
  const srv = await startServer({ dir: outdir, port: 0, quiet: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: reducedMotion ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  const initial = seed === 'none' ? {} : { ...buildSeed({ level }), ...storage };
  if (seed === 'none') Object.assign(initial, storage);
  await context.addInitScript((data) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, initial);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/favicon|Download the React DevTools|Service Worker registration blocked/.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  const app = {
    baseUrl: `http://localhost:${srv.port}`,
    async goto(tab = 'DASHBOARD') { await page.goto(`${this.baseUrl}/#/${TAB_SLUG[tab] || tab}`); await page.waitForSelector('#root > :not(#boot)', { timeout: 15000 }); await page.waitForTimeout(700); },
    async nav(tab) { await page.evaluate((s) => { location.hash = '#/' + s; }, TAB_SLUG[tab] || tab); await page.waitForTimeout(600); },
  };
  try { return await fn({ page, app, errors, browser, context }); }
  finally { await browser.close(); await srv.close(); if (!reuseBuild) await rm(tmp, { recursive: true, force: true }); }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return [m[1], m[2] ?? true]; }));
  const opts = { w: +args.w || 1472, h: +args.h || 920, seed: args.seed || 'demo', level: args.level || 'inter', dpr: +args.dpr || 1, reducedMotion: !!args.reduced };
  await withApp(opts, async ({ page, app, errors }) => {
    if (args.script) {
      const mod = await import(pathToFileURL(path.resolve(args.script)).href);
      await mod.default({ page, app, errors });
    } else {
      const tabs = String(args.tab || 'DASHBOARD').split(',');
      for (const tab of tabs) {
        tabs.indexOf(tab) === 0 ? await app.goto(tab) : await app.nav(tab);
        const out = args.out ? (tabs.length > 1 ? args.out.replace(/(\.\w+)$/, `-${tab.toLowerCase()}$1`) : args.out) : `/tmp/ca-${tab.toLowerCase()}.png`;
        await page.screenshot({ path: out, fullPage: !!args.full });
        console.log('saved', out);
      }
    }
    if (errors.length) console.log('\nCONSOLE ISSUES:\n' + errors.join('\n')); else console.log('no console errors');
  });
}
