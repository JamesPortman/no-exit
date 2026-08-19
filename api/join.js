// Player joins a game with the room code, picking their assigned team.
const crypto = require('crypto');
const { getStore } = require('./_lib/store.js');
const {
  MAX_PLAYERS, TTL_SEC, loadGame, playersKey, appendLog, sendJSON,
} = require('./_lib/games.js');
const { rateLimit } = require('./_lib/ratelimit.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  if (!(await rateLimit(req, res, 'join', 30, 600))) return;

  const body = req.body || {};
  const code = String(body.code || '').toUpperCase();
  const name = String(body.name || '').trim().slice(0, 24);
  const teamId = String(body.teamId || '');

  const meta = await loadGame(code);
  if (!meta) return sendJSON(res, 404, { error: 'game not found — check the code' });
  if (meta.state === 'finished') return sendJSON(res, 400, { error: 'this game has ended' });
  // Solo runs mint their one player at creation; anyone else with the code
  // would otherwise be able to play along.
  if (meta.mode === 'solo') return sendJSON(res, 400, { error: 'this is a solo game' });
  if (!name) return sendJSON(res, 400, { error: 'name required' });
  if (!meta.teams.some((t) => t.id === teamId)) {
    return sendJSON(res, 400, { error: 'pick a team' });
  }

  const store = getStore();
  const players = await store.hgetallJSON(playersKey(code));
  if (Object.keys(players).length >= MAX_PLAYERS) {
    return sendJSON(res, 400, { error: 'game is full' });
  }

  const playerId = crypto.randomUUID();
  const player = { name, teamId, token: crypto.randomUUID(), joinedAt: Date.now() };
  // hsetnx guards the (vanishingly unlikely) UUID collision; joins racing the
  // player-cap check may briefly overshoot MAX_PLAYERS, which is harmless.
  const ok = await store.hsetnxJSON(playersKey(code), playerId, player, TTL_SEC);
  if (!ok) return sendJSON(res, 500, { error: 'try again' });

  await appendLog(code, { type: 'join', teamId, name });
  sendJSON(res, 200, { playerId, token: player.token, teamId, code });
};
