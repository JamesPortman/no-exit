// Host controls: start, pause/resume, broadcast, free hint, force-advance,
// end. All require the hostToken returned at creation.
const {
  loadGame, saveGame, loadTeam, saveTeam, elapsedMs, adventureFor,
  appendLog, sendJSON,
} = require('./_lib/games.js');
const { recordResultsOnce } = require('./_lib/db.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  const body = req.body || {};
  const code = String(body.code || '').toUpperCase();
  const meta = await loadGame(code);
  if (!meta) return sendJSON(res, 404, { error: 'game not found' });
  if (!body.hostToken || body.hostToken !== meta.hostToken) {
    return sendJSON(res, 403, { error: 'not the host' });
  }

  const now = Date.now();
  const action = body.action;

  if (action === 'start') {
    if (meta.state !== 'lobby') return sendJSON(res, 400, { error: 'already started' });
    meta.state = 'running';
    meta.startAt = now;
    await saveGame(meta);
    await appendLog(code, { type: 'host', action });
    return sendJSON(res, 200, { ok: true, state: meta.state });
  }

  if (action === 'pause') {
    if (meta.state !== 'running') return sendJSON(res, 400, { error: 'not running' });
    meta.state = 'paused';
    meta.pausedAt = now;
    await saveGame(meta);
    await appendLog(code, { type: 'host', action });
    return sendJSON(res, 200, { ok: true, state: meta.state });
  }

  if (action === 'resume') {
    if (meta.state !== 'paused') return sendJSON(res, 400, { error: 'not paused' });
    meta.pauseAccumMs = (meta.pauseAccumMs || 0) + (now - meta.pausedAt);
    meta.pausedAt = null;
    meta.state = 'running';
    await saveGame(meta);
    await appendLog(code, { type: 'host', action });
    return sendJSON(res, 200, { ok: true, state: meta.state });
  }

  if (action === 'kick') {
    const { getStore } = require('./_lib/store.js');
    const { playersKey } = require('./_lib/games.js');
    const playerId = String(body.playerId || '');
    const players = await getStore().hgetallJSON(playersKey(code));
    const player = players[playerId];
    if (!player) return sendJSON(res, 400, { error: 'no such player' });
    await getStore().hdelJSON(playersKey(code), playerId);
    await appendLog(code, { type: 'kick', teamId: player.teamId, name: player.name });
    return sendJSON(res, 200, { ok: true });
  }

  if (action === 'broadcast') {
    const msg = String(body.message || '').trim().slice(0, 200);
    if (!msg) return sendJSON(res, 400, { error: 'message required' });
    meta.broadcast = { msg, at: now };
    await saveGame(meta);
    await appendLog(code, { type: 'host', action, msg });
    return sendJSON(res, 200, { ok: true });
  }

  if (action === 'end') {
    if (meta.state === 'finished') return sendJSON(res, 400, { error: 'already finished' });
    if (!meta.startAt) meta.startAt = now; // ended straight from the lobby
    meta.endedAt = meta.state === 'paused' ? meta.pausedAt : now;
    meta.state = 'finished';
    await saveGame(meta);
    await appendLog(code, { type: 'host', action });
    await recordResultsOnce(meta);
    return sendJSON(res, 200, { ok: true, state: meta.state });
  }

  // Team-targeted actions below.
  const teamId = String(body.teamId || '');
  if (!meta.teams.some((t) => t.id === teamId)) {
    return sendJSON(res, 400, { error: 'unknown team' });
  }
  const adventure = adventureFor(meta);
  const team = await loadTeam(code, teamId);
  const current = adventure.puzzles[team.puzzleIdx];

  if (action === 'freehint') {
    if (!current) return sendJSON(res, 400, { error: 'team already finished' });
    const taken = team.hintsTaken[current.id] || 0;
    if (taken >= (current.hints || []).length) {
      return sendJSON(res, 400, { error: 'no more hints for this puzzle' });
    }
    // Reveal without the penalty — that's what makes it a gift.
    team.hintsTaken[current.id] = taken + 1;
    await saveTeam(code, teamId, team);
    await appendLog(code, { type: 'freehint', teamId, puzzleId: current.id, hintIdx: taken });
    return sendJSON(res, 200, { ok: true });
  }

  if (action === 'advance') {
    if (!current) return sendJSON(res, 400, { error: 'team already finished' });
    const atMs = elapsedMs(meta, now);
    team.solves.push({ puzzleId: current.id, atMs, forced: true });
    team.puzzleIdx += 1;
    if (team.puzzleIdx >= adventure.puzzles.length) {
      team.finishedAtMs = atMs + team.penaltyMs;
    }
    await saveTeam(code, teamId, team);
    await appendLog(code, {
      type: 'advance', teamId, puzzleId: current.id, puzzleTitle: current.title,
    });
    return sendJSON(res, 200, { ok: true });
  }

  sendJSON(res, 400, { error: 'unknown action' });
};
