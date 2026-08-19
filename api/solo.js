// Start a Solo run: one player, no host, puzzles generated on the spot.
//
// Deliberately a separate endpoint rather than a flag on /api/create. Solo is
// public — it must work with no host key — and burying an auth bypass inside
// the gated endpoint is one reordered early-return away from ungating normal
// game creation. Keeping the public surface in its own file makes it
// auditable, and gives it its own rate-limit bucket.
const crypto = require('crypto');
const { getStore } = require('./_lib/store.js');
const {
  TTL_SEC, newCode, loadGame, saveGame, saveTeam, newTeamState,
  playersKey, sendJSON,
} = require('./_lib/games.js');
const { rateLimit } = require('./_lib/ratelimit.js');
const { generate } = require('./_lib/solo/generate.js');
const { newSeed } = require('./_lib/solo/rng.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  if (!(await rateLimit(req, res, 'solo', 12, 3600))) return;

  const name = String((req.body || {}).name || '').trim().slice(0, 24) || 'Solo';

  // The seed is generated here and never leaves the server: the generator is
  // public, so a seed in a client response would be the full answer key.
  //
  // The E2E suite needs a run whose answers it can compute, so a fixed seed
  // may be supplied by the ENVIRONMENT — never by the request, and never
  // where VERCEL_ENV is set, so it cannot apply in production or preview.
  const seed = (!process.env.VERCEL_ENV && process.env.SOLO_TEST_SEED) || newSeed();
  const adventure = generate(seed);

  let code;
  for (let i = 0; i < 5; i++) {
    code = newCode();
    if (!(await loadGame(code))) break;
    code = null;
  }
  if (!code) return sendJSON(res, 500, { error: 'could not allocate a game code' });

  const now = Date.now();
  const meta = {
    code,
    mode: 'solo',
    adventureSlug: adventure.slug,
    soloSeed: seed,           // provenance: lets a bug be reproduced exactly
    soloAdventure: adventure, // materialised once; adventureFor reads it back
    // No lobby and no host: the clock starts the moment the player asks for a
    // run, which is why solo.html collects the name before calling this.
    state: 'running',
    startAt: now,
    pausedAt: null,
    pauseAccumMs: 0,
    endedAt: null,
    durationMs: adventure.durationMin * 60 * 1000,
    puzzleCount: adventure.puzzles.length,
    // Stored as null rather than merely withheld: host actions and the host
    // answer key both compare against this, and a secret that does not exist
    // cannot leak through a future logging change.
    hostToken: null,
    teams: [{ id: 't1', name }],
    broadcast: null,
    createdAt: now,
  };
  await saveGame(meta);
  await saveTeam(code, 't1', newTeamState());

  // Mint the one player here too — a solo run has no join step, and leaving a
  // window where the code exists with an open roster invites company.
  const playerId = crypto.randomUUID();
  const player = { name, teamId: 't1', token: crypto.randomUUID(), joinedAt: now };
  await getStore().hsetnxJSON(playersKey(code), playerId, player, TTL_SEC);

  sendJSON(res, 200, {
    code,
    playerId,
    token: player.token,
    durationMin: adventure.durationMin,
    puzzleCount: adventure.puzzles.length,
  });
};
