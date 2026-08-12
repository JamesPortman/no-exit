// Past game results for the host, straight from Neon. POST with the same
// ADMIN_TOKEN that gates game creation (body, not query, so the token never
// lands in access logs).
const { sendJSON } = require('./_lib/games.js');
const { rateLimit } = require('./_lib/ratelimit.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  if (!(await rateLimit(req, res, 'history', 30, 600))) return;

  const { adminToken } = req.body || {};
  if (process.env.ADMIN_TOKEN && adminToken !== process.env.ADMIN_TOKEN) {
    return sendJSON(res, 403, { error: 'not authorized' });
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
