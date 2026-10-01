// Past game results for the host, straight from Neon. POST with the same
// ADMIN_TOKEN that gates game creation (body, not query, so the token never
// lands in access logs). Refuses outright when ADMIN_TOKEN is unset: the
// history holds every past player's name.
const { sendJSON } = require('./_lib/games.js');
const { rateLimit } = require('./_lib/ratelimit.js');
const { isAdmin } = require('./_lib/auth.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  if (!(await rateLimit(req, res, 'history', 30, 600))) return;

  const { adminToken } = req.body || {};
  if (!isAdmin(adminToken)) {
    return sendJSON(res, 403, { error: 'not authorized' });
  }

  // Delete one past game: every team row with that code, played in that
  // minute (the same grouping the history page shows). Codes are reused over
  // time, so the code alone could take an unrelated older game with it.
  if (req.body.action === 'delete') {
    const gameCode = String(req.body.gameCode || '').toUpperCase();
    const playedAt = new Date(req.body.playedAt);
    if (!/^[A-Z2-9]{4}$/.test(gameCode) || Number.isNaN(playedAt.getTime())) {
      return sendJSON(res, 400, { error: 'gameCode and playedAt required' });
    }
    if (!process.env.DATABASE_URL) return sendJSON(res, 200, { deleted: 0 });
    try {
      const { neon } = require('@neondatabase/serverless');
      const q = neon(process.env.DATABASE_URL);
      const rows = await q`
        DELETE FROM game_results
        WHERE game_code = ${gameCode}
          AND date_trunc('minute', played_at) = date_trunc('minute', ${playedAt.toISOString()}::timestamptz)
        RETURNING id`;
      return sendJSON(res, 200, { deleted: rows.length });
    } catch (e) {
      console.error('[history delete]', e);
      return sendJSON(res, 500, { error: 'could not delete — try again' });
    }
  }

  if (!process.env.DATABASE_URL) return sendJSON(res, 200, { games: [] });
  try {
    const { neon } = require('@neondatabase/serverless');
    const q = neon(process.env.DATABASE_URL);
    const rows = await q`
      SELECT game_code, adventure_slug, played_at, team_name, players_json,
             puzzles_solved, total_puzzles, finish_ms, penalty_ms, won
      FROM game_results
      ORDER BY played_at DESC, id DESC
      LIMIT 200`;
    sendJSON(res, 200, { games: rows });
  } catch (e) {
    console.error('[history]', e);
    sendJSON(res, 200, { games: [] }); // history is best-effort, like the write
  }
};
