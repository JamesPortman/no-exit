// A team submits an answer for its current puzzle. Any teammate may submit;
// the puzzleId in the request guards against double-advance when two
// teammates submit at the same moment.
const {
  loadTeam, saveTeam, saveGame, elapsedMs, maybeExpire, checkAnswer, adventureFor,
  appendLog, sendJSON, requirePlayer,
} = require('./_lib/games.js');
const { rateLimitKey } = require('./_lib/ratelimit.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  const ctx = await requirePlayer(req, res);
  if (!ctx) return;
  let { meta, player, playerId } = ctx;

  meta = await maybeExpire(meta);
  if (meta.state !== 'running') {
    return sendJSON(res, 400, { error: `game is ${meta.state}` });
  }

  if (!(await rateLimitKey(res, `answer:${meta.code}:${player.teamId}`, 15, 60))) return;

  const adventure = adventureFor(meta);
  const team = await loadTeam(meta.code, player.teamId);
  if (team.finishedAtMs != null) {
    return sendJSON(res, 400, { error: 'your team already escaped!' });
  }

  const current = adventure.puzzles[team.puzzleIdx];
  const { puzzleId, guess } = req.body || {};
  if (!current || puzzleId !== current.id) {
    // Teammate already advanced the puzzle — not an error, just stale.
    return sendJSON(res, 200, { correct: false, stale: true });
  }

  if (checkAnswer(current, guess)) {
    const atMs = elapsedMs(meta);
    team.solves.push({ puzzleId: current.id, atMs });
    team.puzzleIdx += 1;
    const finished = team.puzzleIdx >= adventure.puzzles.length;
    if (finished) team.finishedAtMs = atMs + team.penaltyMs;
    await saveTeam(meta.code, player.teamId, team);
    await appendLog(meta.code, {
      type: 'solve', teamId: player.teamId, name: player.name,
      puzzleId: current.id, puzzleTitle: current.title, atMs, finished,
    });
    // Nobody is hosting a solo run, so finishing the last puzzle has to end
    // the game itself — otherwise the player waits out the clock on a screen
    // meant for teams still playing. endedAt matters: elapsedMs reads it once
    // finished, and leaving it unset makes every derived time NaN.
    if (finished && meta.mode === 'solo') {
      meta.state = 'finished';
      meta.endedAt = Date.now();
      await saveGame(meta);
    }
    return sendJSON(res, 200, {
      correct: true,
      solveMessage: current.solveMessage || '',
      finished,
    });
  }

  team.wrongCount += 1;
  await saveTeam(meta.code, player.teamId, team);
  await appendLog(meta.code, {
    type: 'wrong', teamId: player.teamId, name: player.name,
    puzzleId: current.id, guess: String(guess || '').slice(0, 80),
  });
  sendJSON(res, 200, { correct: false });
};
