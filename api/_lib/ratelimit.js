// Fixed-window rate limiting over the KV store. Fails open: a store hiccup
// should never lock people out of the game.
// Copied from Terra Incognita, plus a team-keyed variant for answer attempts.
const { getStore } = require('./store.js');
const { sendJSON } = require('./games.js');

function clientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// Returns true if the request may proceed. On deny, sends the 429 itself.
async function rateLimit(req, res, bucket, limit, windowSec) {
  const ip = clientIp(req);
  // `vercel dev` (local play + E2E) has no proxy header and hits the shared
  // production Redis — don't throttle it. Real Vercel traffic always carries
  // a platform-set x-forwarded-for, so this never opens up in production.
  if (LOOPBACK.has(ip) && !req.headers?.['x-forwarded-for']) return true;
  return windowCheck(res, `rl:${bucket}:${ip}`, limit, windowSec);
}

// Keyed variant (e.g. per-team answer attempts) — not IP-based, so it applies
// locally too. Callers pass a stable key like `answer:CODE:teamId`.
async function rateLimitKey(res, key, limit, windowSec) {
  return windowCheck(res, `rl:${key}`, limit, windowSec);
}

async function windowCheck(res, prefix, limit, windowSec) {
  let n;
  try {
    const win = Math.floor(Date.now() / (windowSec * 1000));
    n = await getStore().incr(`${prefix}:${win}`, windowSec * 2);
  } catch {
    return true;
  }
  if (n > limit) {
    sendJSON(res, 429, { error: 'too many requests — slow down and try again shortly' });
    return false;
  }
  return true;
}

module.exports = { rateLimit, rateLimitKey, clientIp };
