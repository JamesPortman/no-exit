// Persistent game history in Neon Postgres: one row per team per game,
// written once when a game reaches `finished`. Best-effort — a database
// hiccup must never break the live game, so failures only log.
const { getStore } = require('./store.js');
const { playersKey, loadTeam, saveGame, rankTeams, adventureFor } = require('./games.js');

let sqlPromise = null;
function sql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlPromise) {
    const { neon } = require('@neondatabase/serverless');
    const q = neon(process.env.DATABASE_URL);
    sqlPromise = q`
      CREATE TABLE IF NOT EXISTS game_results (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        game_code TEXT NOT NULL,
        adventure_slug TEXT NOT NULL,
        played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        team_name TEXT NOT NULL,
        players_json JSONB NOT NULL,
        puzzles_solved INT NOT NULL,
        total_puzzles INT NOT NULL,
        finish_ms BIGINT,
        penalty_ms BIGINT NOT NULL,
        won BOOLEAN NOT NULL
      )`
      // Solo runs get their own table rather than a flag on game_results:
      // the board is public and would otherwise bury real event history,
      // which is capped at 200 rows.
      .then(() => q`
        CREATE TABLE IF NOT EXISTS solo_scores (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          game_code TEXT NOT NULL,
          played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          player_name TEXT NOT NULL,
          room TEXT NOT NULL,
          puzzles_solved INT NOT NULL,
          total_puzzles INT NOT NULL,
          finish_ms BIGINT NOT NULL,
          penalty_ms BIGINT NOT NULL
        )`)
      .then(() => q);
  }
  return sqlPromise;
}

// Idempotent-enough: the resultsWritten flag is saved before inserting, so a
// polling race right at the finish line at worst loses the row, never
// duplicates it. Fixture/test adventures (hidden: true) are never recorded.
async function recordResultsOnce(meta) {
  if (meta.state !== 'finished' || meta.resultsWritten) return;
  // Solo runs are a private personal best, kept in the player's own browser.
  // Recording them here would bury real event history under public traffic.
  if (meta.mode === 'solo') return;
  meta.resultsWritten = true;
  await saveGame(meta);

  try {
    const adventure = adventureFor(meta);
    if (adventure.hidden) return;
    const q = await sql();
    if (!q) return; // Neon not provisioned — history is optional

    const players = await getStore().hgetallJSON(playersKey(meta.code));
    const teamStates = {};
    for (const t of meta.teams) teamStates[t.id] = await loadTeam(meta.code, t.id);
    const ranking = rankTeams(meta, teamStates, adventure);

    // One shared timestamp so all of a game's rows group as a single event.
    const playedAt = new Date().toISOString();
    for (const [i, r] of ranking.entries()) {
      const names = Object.values(players)
        .filter((p) => p.teamId === r.teamId)
        .map((p) => p.name);
      await q`
        INSERT INTO game_results
          (game_code, adventure_slug, played_at, team_name, players_json,
           puzzles_solved, total_puzzles, finish_ms, penalty_ms, won)
        VALUES
          (${meta.code}, ${meta.adventureSlug}, ${playedAt}, ${r.name},
           ${JSON.stringify(names)}, ${r.solved}, ${r.totalPuzzles},
           ${r.finishedAtMs}, ${r.penaltyMs}, ${i === 0})`;
    }
  } catch (e) {
    console.error('[db] failed to record game results', e);
  }
}

// One row per completed solo run. Written server-side from the game record —
// never from the client, which could otherwise post any time it liked.
// Unfinished runs are not recorded: the board is "fastest escapes", and a
// list of people who ran out of time motivates nobody.
async function recordSoloScore(meta) {
  if (meta.mode !== 'solo' || meta.soloRecorded) return;
  meta.soloRecorded = true;
  await saveGame(meta);

  try {
    const q = await sql();
    if (!q) return; // no Neon — the browser-local personal best still works

    const adventure = adventureFor(meta);
    const team = await loadTeam(meta.code, 't1');
    if (team.finishedAtMs == null) return; // did not escape

    const players = await getStore().hgetallJSON(playersKey(meta.code));
    const name = Object.values(players)[0]?.name || 'Solo';
    await q`
      INSERT INTO solo_scores
        (game_code, player_name, room, puzzles_solved, total_puzzles,
         finish_ms, penalty_ms)
      VALUES
        (${meta.code}, ${name}, ${adventure.title}, ${team.solves.length},
         ${adventure.puzzles.length}, ${team.finishedAtMs}, ${team.penaltyMs})`;
  } catch (e) {
    console.error('[db] failed to record solo score', e);
  }
}

// One entry per player: their own best run, fastest first. Done here rather
// than in SQL so it is testable without a database.
function bestPerPlayer(rows, limit = 20) {
  const best = new Map();
  for (const r of rows) {
    const key = String(r.player_name || '').trim().toLowerCase();
    const prev = best.get(key);
    if (!prev || Number(r.finish_ms) < Number(prev.finish_ms)) best.set(key, r);
  }
  return [...best.values()]
    .sort((a, b) => Number(a.finish_ms) - Number(b.finish_ms))
    .slice(0, limit);
}

async function topSoloScores(limit = 20) {
  try {
    const q = await sql();
    if (!q) return [];
    // Pull a generous window, then reduce to one row per player.
    const rows = await q`
      SELECT id, player_name, room, puzzles_solved, total_puzzles,
             finish_ms, penalty_ms, played_at
      FROM solo_scores
      ORDER BY finish_ms ASC
      LIMIT 500`;
    return bestPerPlayer(rows, limit);
  } catch (e) {
    console.error('[db] failed to read the solo board', e);
    return [];
  }
}

// A public board with free-text names needs a way to remove an entry.
async function deleteSoloScore(id) {
  try {
    const q = await sql();
    if (!q) return false;
    await q`DELETE FROM solo_scores WHERE id = ${Number(id)}`;
    return true;
  } catch (e) {
    console.error('[db] failed to delete a solo score', e);
    return false;
  }
}

module.exports = {
  recordResultsOnce, recordSoloScore, topSoloScores, deleteSoloScore, bestPerPlayer,
};
