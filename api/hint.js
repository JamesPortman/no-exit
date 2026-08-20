// A team reveals the next hint for its current puzzle, taking the time
// penalty. Hints unlock strictly in order; each penalty applies once per
// hint index no matter how many teammates click.
const {
  loadTeam, saveTeam, maybeExpire, adventureFor, appendLog, sendJSON,
  requirePlayer,
} = require('./_lib/games.js');
const { localizeAdventure, langOf } = require('./_lib/content.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  const ctx = await requirePlayer(req, res);
  if (!ctx) return;
  let { meta, player } = ctx;

  meta = await maybeExpire(meta);
  if (meta.state !== 'running') {
    return sendJSON(res, 400, { error: `game is ${meta.state}` });
  }

  const adventure = localizeAdventure(adventureFor(meta), langOf(req));
  const team = await loadTeam(meta.code, player.teamId);
  const current = adventure.puzzles[team.puzzleIdx];
  const { puzzleId } = req.body || {};
  if (!current || puzzleId !== current.id) {
    return sendJSON(res, 200, { stale: true });
  }

  const taken = team.hintsTaken[current.id] || 0;
  const hints = current.hints || [];
  if (taken >= hints.length) {
    return sendJSON(res, 400, { error: 'no more hints for this puzzle' });
  }

  const hint = hints[taken];
  team.hintsTaken[current.id] = taken + 1;
  team.penaltyMs += hint.penaltySec * 1000;
  await saveTeam(meta.code, player.teamId, team);
  await appendLog(meta.code, {
    type: 'hint', teamId: player.teamId, name: player.name,
    puzzleId: current.id, hintIdx: taken, penaltySec: hint.penaltySec,
  });

  sendJSON(res, 200, {
    hint: hint.text,
    penaltySec: hint.penaltySec,
    revealedHints: hints.slice(0, taken + 1).map((h) => h.text),
  });
};
