// Prints the CSS spring tokens used by src/styles/ios.css, from the same maths the gestures use (src/lib/spring.ts).
// Run: node tools/ios/springs.mjs     (paste the output into the "springs" block of ios.css when a spec changes)
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = await mkdtemp(path.join(tmpdir(), 'ca-springs-'));
await build({ entryPoints: [path.join(root, 'src/lib/spring.ts')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(dir, 'spring.mjs'), logLevel: 'error' });
const S = await import(pathToFileURL(path.join(dir, 'spring.mjs')).href);
await rm(dir, { recursive: true, force: true });

const lines = [];
for (const [name, spec] of Object.entries(S.SPRINGS)) {
  const c = S.springCurve(spec, 0, S.TOKEN_POINTS);
  const over = (S.overshootOf(spec) - 1) * 100;
  lines.push(`  /* ${name}: response ${spec.response}s, damping ${spec.damping}, overshoot ${over.toFixed(1)} % */`);
  lines.push(`  --ios-spring-${name}: ${c.easing};`);
  lines.push(`  --ios-spring-${name}-d: ${c.duration}ms;`);
}
console.log(lines.join('\n'));
