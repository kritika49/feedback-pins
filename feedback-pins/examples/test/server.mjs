// Serves the test page and runs the REAL comments.mjs handler with an in-memory stand-in for Netlify Blobs.
// Usage: node server.mjs <port> <path to comments.mjs> <path to the client script, served as /cm.js>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, PORT, FN, CLIENT] = process.argv; const DIR = path.dirname(new URL(import.meta.url).pathname);
const mem = new Map();
const stub = `const getStore = () => ({ list: async () => ({ blobs: [...globalThis.__mem.keys()].map((key) => ({ key })) }), get: async (k) => globalThis.__mem.get(k), setJSON: async (k, v) => { globalThis.__mem.set(k, v); }, delete: async (k) => { globalThis.__mem.delete(k); } });`;
globalThis.__mem = mem;
const src = fs.readFileSync(FN, 'utf8').replace(/import \{ getStore \} from "@netlify\/blobs";/, stub);
const handler = (await import('data:text/javascript,' + encodeURIComponent(src))).default;
http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/comments')) {
    let body = ''; for await (const ch of req) body += ch;
    const r = await handler(new Request('http://x' + req.url, { method: req.method, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : body }));
    res.writeHead(r.status, { 'Content-Type': 'application/json' }); return res.end(await r.text());
  }
  const f = req.url.startsWith('/p2') || req.url === '/' ? 'app.html' : req.url.split('?')[0].slice(1);
  try { const d = fs.readFileSync(f === 'cm.js' && CLIENT ? CLIENT : path.join(DIR, path.basename(f))); res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } catch { res.writeHead(404); res.end(); }
}).listen(PORT, '127.0.0.1');
