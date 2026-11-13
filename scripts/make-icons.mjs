// Regenerates public/icon.svg and the PNG icons from src/components/layout/Logo.tsx, which is the one place the brand mark is drawn.
// Needs only esbuild and playwright (both are dev dependencies already). Run it again after changing the Logo.
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { r } from './lib.mjs';

const require = createRequire(import.meta.url);
const accent = '#4dd8e8';

// Render the React component to plain SVG text, once per variant.
const entry = `
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Logo } from ${JSON.stringify(r('src/components/layout/Logo.tsx'))};
export const svg = (variant) => renderToStaticMarkup(createElement(Logo, { size: 512, accent: ${JSON.stringify(accent)}, variant, still: true }));
`;
const built = await build({ absWorkingDir: r('.'), stdin: { contents: entry, resolveDir: r('.'), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', logLevel: 'silent' });
const mod = { exports: {} };
new Function('module', 'exports', 'require', built.outputFiles[0].text)(mod, mod.exports, require);
const standalone = (markup) => markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/ width="512" height="512"/, '').replace(' aria-hidden="true"', '');

const tile = standalone(mod.exports.svg('tile'));
const bleed = standalone(mod.exports.svg('bleed'));
const mask = standalone(mod.exports.svg('mask'));
await writeFile(r('public/icon.svg'), tile + '\n');
await mkdir(r('public/icons'), { recursive: true });

const browser = await chromium.launch();
async function png(svg, size, file) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: r('public/icons', file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
}
await png(tile, 192, 'icon-192.png');
await png(tile, 512, 'icon-512.png');
await png(bleed, 180, 'apple-touch-icon.png'); // iOS rounds the corners itself, so this one is a full square
await png(mask, 512, 'maskable-512.png'); // full-bleed background, the scope pulled into the central safe zone
await browser.close();
console.log('icons written');
