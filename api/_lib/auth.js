// Token checks shared by every endpoint that takes a secret.
const crypto = require('crypto');

// Constant-time string compare. Both sides must be non-empty strings; each is
// hashed first so the buffers are always equal length and the compare leaks
// neither content nor length.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Does this request carry the ADMIN_TOKEN? With no token configured, the
// answer is no — except for game creation (`allowUnset`) off Vercel, so local
// dev and the test suites keep working without a key. Any deployment
// (VERCEL_ENV set) fails closed.
function isAdmin(provided, { allowUnset = false } = {}) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return allowUnset && !process.env.VERCEL_ENV;
  return safeEqual(provided, expected);
}

// Look up a player by id without letting `__proto__`/`constructor`/etc.
// resolve to something inherited from Object.prototype.
function ownEntry(obj, key) {
  if (!obj || typeof key !== 'string' || !key) return null;
  return Object.hasOwn(obj, key) ? obj[key] : null;
}

// A player's credentials: the id must name a real roster entry, and the
// token must match it.
function playerFor(players, playerId, token) {
  const player = ownEntry(players, playerId);
  return player && safeEqual(token, player.token) ? player : null;
}

module.exports = { safeEqual, isAdmin, ownEntry, playerFor };
