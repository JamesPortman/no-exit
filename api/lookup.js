// Public, minimal game lookup for the join page: title + team names only,
// so a player with just the code can pick their team, and see which teams are
// already full. No tokens, no puzzles, no player names.
const { getStore } = require('./_lib/store.js');
const {
  loadGame, adventureFor, sendJSON, playersKey, MAX_PER_TEAM,
} = require('./_lib/games.js');
const { rateLimit } = require('./_lib/ratelimit.js');

module.exports = async (req, res) => {
  if (!(await rateLimit(req, res, 'lookup', 60, 600))) return;
  const code = String(req.query.code || '').toUpperCase();
  const meta = await loadGame(code);
  if (!meta) return sendJSON(res, 404, { error: 'game not found — check the code' });
  // Solo runs are not joinable, so the join page must not advertise them.
  if (meta.mode === 'solo') return sendJSON(res, 404, { error: 'game not found — check the code' });
  const adventure = adventureFor(meta);
  const players = Object.values(await getStore().hgetallJSON(playersKey(code)));
  const count = (id) => players.filter((p) => p.teamId === id).length;
  sendJSON(res, 200, {
    code,
    title: adventure?.title || 'No Exit',
    i18n: adventure?.i18n || null,
    state: meta.state,
    teams: meta.teams.map((t) => ({ id: t.id, name: t.name, full: count(t.id) >= MAX_PER_TEAM })),
  });
};
