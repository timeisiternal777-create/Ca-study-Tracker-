// Production build: bundles the app with esbuild into dist/ (or $OUT_DIR).
import * as esbuild from 'esbuild';
import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { esbuildOptions, emitHtml, copyPublic, emitServiceWorker, r, root } from './lib.mjs';

export async function build({ outdir = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : r('dist'), quiet = false } = {}) {
  const t0 = performance.now();
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  const opts = esbuildOptions({ outdir });
  if (quiet) opts.logLevel = 'error';
  const result = await esbuild.build(opts);
  // esbuild also emits a standalone .css per lazy chunk; those rules are already hoisted into the entry stylesheet.
  const entryCss = Object.values(result.metafile.outputs).filter((o) => o.entryPoint === 'src/main.tsx').map((o) => o.cssBundle).filter(Boolean).map((f) => path.resolve(root, f));
  for (const f of Object.keys(result.metafile.outputs)) {
    const abs = path.resolve(root, f);
    if (f.endsWith('.css') && !entryCss.includes(abs)) await rm(abs, { force: true });
  }
  await copyPublic(outdir);
  await emitHtml({ outdir, metafile: result.metafile });
  const sw = await emitServiceWorker({ outdir });
  if (!quiet) console.log(`\n✔ built to ${path.relative(process.cwd(), outdir) || '.'} in ${Math.round(performance.now() - t0)} ms (service worker v${sw.version}, ${sw.count} precached files)`);
  return { outdir, metafile: result.metafile };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch((e) => { console.error(e); process.exit(1); });
}
