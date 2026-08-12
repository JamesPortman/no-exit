// Minimal local dev server: routes /api/<name> to the serverless handlers
// with Vercel-style req/res shims, and serves static files from the repo
// root and public/. For local play and curl testing before `vercel dev` is
// linked; production uses real Vercel functions.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3400;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
    const file = path.join(__dirname, 'api', `${name}.js`);
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'application/json' });
      return res.end('{"error":"no such endpoint"}');
    }

    let body = {};
    if (req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch {}
    }

    const shimRes = {
      status(s) { res.statusCode = s; return this; },
      json(o) {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(o));
        return this;
      },
    };
    const shimReq = {
      method: req.method,
      headers: req.headers,
      socket: req.socket,
      query: Object.fromEntries(url.searchParams),
      body,
    };
    try {
      await require(file)(shimReq, shimRes);
    } catch (e) {
      console.error(`[api/${name}]`, e);
      if (!res.writableEnded) shimRes.status(500).json({ error: 'internal error' });
    }
    return;
  }

  // Static: try repo root (index.html, play.html, host.html), then public/.
  // Mirror vercel.json's /architecture rewrite.
  let p = url.pathname === '/' ? '/index.html'
    : url.pathname === '/architecture' ? '/architecture.html'
    : url.pathname;
  p = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  for (const base of [__dirname, path.join(__dirname, 'public')]) {
    const file = path.join(base, p);
    if (file.startsWith(base) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      return res.end(fs.readFileSync(file));
    }
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => console.log(`escape-room dev server on http://localhost:${PORT}`));
