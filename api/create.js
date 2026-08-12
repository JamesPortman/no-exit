// Host creates a game: picks an adventure and names 2-3 teams.
// Gated by ADMIN_TOKEN when set so strangers can't create games.
const crypto = require('crypto');
const { getAdventure } = require('./_lib/content.js');
const {
  MAX_TEAMS, newCode, loadGame, saveGame, saveTeam, newTeamState, sendJSON,
} = require('./_lib/games.js');
const { rateLimit } = require('./_lib/ratelimit.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  if (!(await rateLimit(req, res, 'create', 10, 3600))) return;

  const { adventureSlug, teams, adminToken } = req.body || {};
  if (process.env.ADMIN_TOKEN && adminToken !== process.env.ADMIN_TOKEN) {
    return sendJSON(res, 403, { error: 'not authorized to create games' });
  }

  const adventure = getAdventure(adventureSlug);
  if (!adventure) return sendJSON(res, 400, { error: 'unknown adventure' });

  // Optional host overrides, clamped to sane bounds. Fewer puzzles than the
  // adventure has means the game ends on puzzle N (the finale is skipped).
  const { durationMin, puzzleCount } = req.body || {};
  const mins = durationMin === undefined
    ? adventure.durationMin
    : Math.min(120, Math.max(5, Math.round(Number(durationMin) || 0)));
  // Hosts may shorten a game to as few as 5 puzzles, never past the
  // adventure's own length.
  const MIN_PUZZLES = 5;
  const count = puzzleCount === undefined
    ? adventure.puzzles.length
    : Math.min(adventure.puzzles.length,
               Math.max(MIN_PUZZLES, Math.round(Number(puzzleCount) || 0)));

  const names = (Array.isArray(teams) ? teams : [])
    .map((t) => String(t || '').trim().slice(0, 30))
    .filter(Boolean);
  if (names.length < 1 || names.length > MAX_TEAMS) {
    return sendJSON(res, 400, { error: `1-${MAX_TEAMS} team names required` });
  }

  // Retry on the rare code collision with a live game.
  let code;
  for (let i = 0; i < 5; i++) {
    code = newCode();
    if (!(await loadGame(code))) break;
    code = null;
  }
  if (!code) return sendJSON(res, 500, { error: 'could not allocate game code' });

  const meta = {
    code,
    adventureSlug,
    state: 'lobby',
    startAt: null,
    pausedAt: null,
    pauseAccumMs: 0,
    endedAt: null,
    durationMs: mins * 60 * 1000,
    puzzleCount: count,
    hostToken: crypto.randomUUID(),
    teams: names.map((name, i) => ({ id: `t${i + 1}`, name })),
    broadcast: null,
    createdAt: Date.now(),
  };
  await saveGame(meta);
  for (const t of meta.teams) await saveTeam(code, t.id, newTeamState());

  sendJSON(res, 200, {
    code,
    hostToken: meta.hostToken,
    teams: meta.teams,
    joinUrl: `/?join=${code}`,
    durationMin: mins,     // echoed back post-clamp so callers see what stuck
    puzzleCount: count,
  });
};
