// Tiny static server for the production build (dist/). No dependencies.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import { r } from './lib.mjs';

const gz = promisify(gzip);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.map']);

export function startServer({ dir = r('dist'), port = Number(process.env.PORT) || 3000, quiet = false } = {}) {
  const cache = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let rel = decodeURIComponent(url.pathname);
      if (rel === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
      let file = path.join(dir, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      let s = await stat(file).catch(() => null);
      if (s?.isDirectory()) { file = path.join(file, 'index.html'); s = await stat(file).catch(() => null); }
      if (!s) {
        // Single-page app fallback for navigations; real 404 for missing assets.
        if (path.extname(rel)) { res.writeHead(404); return res.end('Not found'); }
        file = path.join(dir, 'index.html');
      }
      const ext = path.extname(file);
      const immutable = /^\/(assets|fonts|icons)\//.test(rel);
      const headers = {
        'content-type': TYPES[ext] || 'application/octet-stream',
        'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        'x-content-type-options': 'nosniff',
      };
      let body = cache.get(file);
      if (!body) { body = await readFile(file); cache.set(file, body); }
      if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        const key = file + '.gz';
        let z = cache.get(key);
        if (!z) { z = await gz(body); cache.set(key, z); }
        headers['content-encoding'] = 'gzip'; headers.vary = 'Accept-Encoding';
        res.writeHead(200, headers); return res.end(z);
      }
      res.writeHead(200, headers); res.end(body);
    } catch (e) {
      res.writeHead(500); res.end(String(e?.message || e));
    }
  });
  return new Promise((resolve) => {
    server.listen(port, () => {
      const actual = server.address().port;
      if (!quiet) console.log(`\n  CA Study Tracker → http://localhost:${actual}\n`);
      resolve({ server, port: actual, close: () => new Promise((ok) => server.close(ok)) });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) startServer();
