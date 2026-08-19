// Public solo leaderboard: the fastest escape recorded by each player.
//
// Read is open — there is nothing secret on it. Removing an entry needs the
// host key, because a public board with free-text names needs a way to take
// something down.
const { sendJSON } = require('./_lib/games.js');
const { topSoloScores, deleteSoloScore } = require('./_lib/db.js');
const { rateLimit } = require('./_lib/ratelimit.js');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { adminToken, id } = req.body || {};
    if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
      return sendJSON(res, 403, { error: 'not authorized' });
    }
    if (!id) return sendJSON(res, 400, { error: 'id required' });
    await deleteSoloScore(id);
    return sendJSON(res, 200, { ok: true, scores: await topSoloScores() });
  }

  if (!(await rateLimit(req, res, 'leaderboard', 120, 600))) return;
  sendJSON(res, 200, { scores: await topSoloScores() });
};
