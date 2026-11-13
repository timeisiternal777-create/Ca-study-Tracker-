// Dev server: esbuild watch + live reload on http://localhost:3000
import * as esbuild from 'esbuild';
import { rm, mkdir } from 'node:fs/promises';
import { esbuildOptions, emitHtml, copyPublic, r } from './lib.mjs';

const outdir = r('.dev');
const port = Number(process.env.PORT) || 3000;

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await copyPublic(outdir);

let first = true;
const ctx = await esbuild.context({
  ...esbuildOptions({ outdir, dev: true }),
  plugins: [
    {
      name: 'emit-html',
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length || !result.metafile) return;
          await emitHtml({ outdir, metafile: result.metafile, dev: true });
          if (first) { first = false; console.log(`\n  CA Study Tracker (dev) → http://localhost:${port}\n`); }
        });
      },
    },
  ],
});
await ctx.watch();
await ctx.serve({ servedir: outdir, port, fallback: undefined });
