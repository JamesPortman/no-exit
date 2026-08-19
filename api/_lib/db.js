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
      )`.then(() => q);
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

module.exports = { recordResultsOnce };
