// Shared build helpers used by build.mjs, dev.mjs and snap.mjs.
import { readFile, writeFile, mkdir, cp, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const r = (...p) => path.join(root, ...p);

/** esbuild options shared by dev and production builds. */
export function esbuildOptions({ outdir, dev = false }) {
  return {
    absWorkingDir: root,
    entryPoints: { app: 'src/main.tsx' },
    bundle: true,
    splitting: true,
    format: 'esm',
    outdir,
    entryNames: dev ? '[name]' : '[name]-[hash]',
    chunkNames: dev ? 'chunks/[name]' : 'chunks/[name]-[hash]',
    assetNames: 'media/[name]-[hash]',
    minify: !dev,
    sourcemap: dev ? 'linked' : false,
    target: ['chrome100', 'safari15', 'firefox100'],
    jsx: 'automatic',
    legalComments: 'none',
    metafile: true,
    logLevel: 'info',
    // Fonts and icons are static files served from /public, not bundled.
    external: ['/fonts/*', '/icons/*'],
    define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
  };
}

async function walk(dir, base = dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...(await walk(p, base)));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

/** Build index.html (+ service worker in production) from the template and esbuild's metafile. */
export async function emitHtml({ outdir, metafile, dev = false }) {
  const template = await readFile(r('index.html'), 'utf8');
  const outputs = Object.entries(metafile.outputs);
  const rel = (k) => '/' + path.relative(outdir, path.join(root, k)).split(path.sep).join('/');
  const entry = outputs.find(([, v]) => v.entryPoint === 'src/main.tsx');
  if (!entry) throw new Error('entry output not found in metafile');
  const js = rel(entry[0]);
  const css = entry[1].cssBundle ? rel(entry[1].cssBundle) : null;

  const preload = ['inter-500', 'inter-600', 'adventor-700', 'inter-display-800']
    .map((f) => `<link rel="preload" href="/fonts/${f}.woff" as="font" type="font/woff" crossorigin>`)
    .join('\n');
  const styles = css ? `<link rel="stylesheet" href="${css}">` : '';
  const devClient = dev
    ? `<script>new EventSource('/esbuild').addEventListener('change',()=>location.reload());window.__DEV__=true</script>`
    : '<script>window.__DEV__=false</script>';
  const scripts = `${devClient}\n<script type="module" src="${js}"></script>`;

  const html = template
    .replace('%PRELOAD%', preload)
    .replace('%STYLES%', styles)
    .replace('%SCRIPTS%', scripts);
  await writeFile(path.join(outdir, 'index.html'), html);
  return { js, css, html };
}

/** Copy /public into the output directory. */
export async function copyPublic(outdir) {
  await mkdir(outdir, { recursive: true });
  await cp(r('public'), outdir, { recursive: true });
}

/** Write a versioned service worker that pre-caches the built app shell. */
export async function emitServiceWorker({ outdir }) {
  const files = (await walk(outdir)).filter((f) => !f.endsWith('.map') && f !== 'sw.js');
  // Only the first sound kit ships with the app shell. Glass, Voyage and Lantern are fetched when someone picks them, then cached by the service worker.
  const urls = ['/', ...files.filter((f) => !/^sfx\/(glass|voyage|lantern)\./.test(f)).map((f) => '/' + f)];
  const hash = createHash('sha1');
  for (const f of files) hash.update(f).update(await readFile(path.join(outdir, f)));
  const version = hash.digest('hex').slice(0, 10);
  const tpl = await readFile(r('scripts', 'sw.template.js'), 'utf8');
  await writeFile(
    path.join(outdir, 'sw.js'),
    tpl.replace('%VERSION%', version).replace('%PRECACHE%', JSON.stringify(urls)),
  );
  return { version, count: urls.length };
}
