// Isolated browser-only demo: no .env, database, private APIs, or master-file access.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const routes = new Map([
  ['/demo', 'index.html'],
  ['/cp-notes.json', 'data/cp-notes.public.json'],
  ...['app.js', 'style.css', 'cp-notebook.js', 'notes-logic.js', 'goal-calendar-logic.js', 'winter-arc-logic.js', 'sw.js', 'offline.html', 'demo-manifest.webmanifest'].map(file => [`/${file}`, file]),
  ...['manifest-loader.js', 'app-icon-192.png', 'app-icon-512.png', 'apple-touch-icon.png'].map(file => [`/assets/${file}`, `assets/${file}`]),
]);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const port = Number(process.env.CP_PREVIEW_PORT || 8795);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid CP_PREVIEW_PORT.');
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  if (pathname === '/') { res.writeHead(302, { Location: '/demo?tab=cp-notebook' }).end(); return; }
  const file = routes.get(pathname);
  if (!file) { res.writeHead(404).end('Not available in the isolated preview.'); return; }
  fs.readFile(path.join(root, file), (error, body) => {
    if (error) { res.writeHead(404).end('Preview file unavailable.'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
}).listen(port, '127.0.0.1', () => console.log(`Local-only CP Notebook preview: http://127.0.0.1:${port}/demo?tab=cp-notebook`));
