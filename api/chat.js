// Team chat: a player posts a message that only their own team (and the
// host) can read. Messages ride back to players on the /api/state poll, so
// there is no separate read endpoint and no websocket.
const { getStore } = require('./_lib/store.js');
const {
  TTL_SEC, CHAT_CAP, chatKey, chatSeqKey, sendJSON, requirePlayer,
} = require('./_lib/games.js');
const { rateLimitKey } = require('./_lib/ratelimit.js');

const MAX_LEN = 300;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  const ctx = await requirePlayer(req, res);
  if (!ctx) return;
  const { meta, player, playerId } = ctx;

  // A solo run has nobody to talk to.
  if (meta.mode === 'solo') return sendJSON(res, 400, { error: 'no team chat in solo' });

  const text = String((req.body || {}).text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
  if (!text) return sendJSON(res, 400, { error: 'message required' });

  if (!(await rateLimitKey(res, `chat:${meta.code}:${playerId}`, 20, 60))) return;

  const store = getStore();
  // A per-team sequence number lets each client ask for "everything after
  // the last one I have" instead of re-downloading the whole log every poll.
  const seq = await store.incr(chatSeqKey(meta.code, player.teamId), TTL_SEC);
  const msg = { seq, at: Date.now(), pid: playerId, name: player.name, text };
  await store.pushCapped(chatKey(meta.code, player.teamId), msg, CHAT_CAP, TTL_SEC);
  sendJSON(res, 200, { ok: true, seq });
};
