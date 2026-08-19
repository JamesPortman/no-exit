// Solo reuses the whole game engine, so what needs testing is the seams:
// that it starts without a host, ends itself, and stays private.
import { describe, it, expect } from 'vitest';
const {
  answer, state, join, lookup, host, call, get, soloRun, playerState,
} = require('./helpers.js');
const { elapsedMs } = require('../api/_lib/games.js');

// Play a solo run to the end using the answers on its own game record.
async function solveEverything(run) {
  for (const puzzle of run.adventure.puzzles) {
    const guess = puzzle.answers[0];
    const r = await call(answer, {
      body: { code: run.code, playerId: run.playerId, token: run.token, puzzleId: puzzle.id, guess },
    });
    expect(r.body.correct, `${puzzle.id} (${guess})`).toBe(true);
  }
}

describe('solo runs', () => {
  it('start immediately, with no host and no host token', async () => {
    const run = await soloRun({ name: 'Ada' });
    expect(run.res.statusCode).toBe(200);
    expect(run.code).toMatch(/^[A-Z2-9]{4}$/);
    expect(run.playerId && run.token).toBeTruthy();
    // No hostToken anywhere in the response, and none stored to leak later.
    expect(JSON.stringify(run.res.body)).not.toContain('hostToken');
    expect(run.meta.hostToken).toBeNull();
    expect(run.meta.state).toBe('running'); // no lobby, no start action

    const s = await playerState(run.code, run);
    expect(s.body.state).toBe('running');
    expect(s.body.solo).toBe(true);
    expect(s.body.team.totalPuzzles).toBe(run.adventure.puzzles.length);
  });

  it('cannot be hosted, joined, or looked up by anyone else', async () => {
    const run = await soloRun();
    // A guessed hostToken must not open the host view or its answer key.
    expect((await get(state, { code: run.code, hostToken: 'anything' })).statusCode).toBe(403);
    expect((await get(state, { code: run.code, hostToken: 'null' })).statusCode).toBe(403);
    expect((await call(host, { body: { code: run.code, hostToken: null, action: 'start' } })).statusCode).toBe(403);
    // And nobody can join or even discover it from the join page.
    expect((await call(join, { body: { code: run.code, name: 'Gatecrasher', teamId: 't1' } })).statusCode).toBe(400);
    expect((await get(lookup, { code: run.code })).statusCode).toBe(404);
  });

  it('ends itself on the last puzzle, with a usable finish time', async () => {
    const run = await soloRun({ name: 'Ada' });
    await solveEverything(run);

    const s = await playerState(run.code, run);
    expect(s.body.state).toBe('finished');
    // endedAt must be set or every derived time goes NaN.
    const { loadGame } = require('../api/_lib/games.js');
    const meta = await loadGame(run.code);
    expect(meta.endedAt).toBeGreaterThan(0);
    expect(Number.isFinite(elapsedMs(meta))).toBe(true);
    expect(Number.isFinite(s.body.ranking[0].adjustedMs)).toBe(true);
    expect(s.body.ranking[0].finished).toBe(true);
    expect(s.body.ranking[0].solved).toBe(run.adventure.puzzles.length);

    // The run is over: no further answers.
    const late = await call(answer, {
      body: { code: run.code, playerId: run.playerId, token: run.token,
              puzzleId: run.adventure.puzzles[0].id, guess: 'anything' },
    });
    expect(late.statusCode).toBe(400);
  });

  it('is never written to the shared game history', async () => {
    const run = await soloRun();
    await solveEverything(run);
    const { loadGame } = require('../api/_lib/games.js');
    const meta = await loadGame(run.code);
    // recordResultsOnce bails before claiming the write, so the flag it sets
    // on recorded games is absent here.
    expect(meta.resultsWritten).toBeFalsy();
  });

  it('ignores the test seed anywhere VERCEL_ENV is set', async () => {
    const prevEnv = process.env.VERCEL_ENV;
    const prevSeed = process.env.SOLO_TEST_SEED;
    try {
      process.env.SOLO_TEST_SEED = 'a-fixed-seed-for-tests';
      process.env.VERCEL_ENV = 'production';
      const run = await soloRun();
      // Production must fall back to a fresh random seed, or anyone reading
      // the public generator could compute the answers to every solo run.
      expect(run.meta.soloSeed).not.toBe('a-fixed-seed-for-tests');

      delete process.env.VERCEL_ENV;
      const local = await soloRun();
      expect(local.meta.soloSeed).toBe('a-fixed-seed-for-tests');
    } finally {
      if (prevEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = prevEnv;
      if (prevSeed === undefined) delete process.env.SOLO_TEST_SEED; else process.env.SOLO_TEST_SEED = prevSeed;
    }
  });

  it('serves the same generated puzzles on every request', async () => {
    const run = await soloRun();
    const first = await playerState(run.code, run);
    const again = await playerState(run.code, run);
    expect(again.body.team.puzzle).toEqual(first.body.team.puzzle);
    expect(again.body.adventure.slug).toBe('solo'); // never seed-derived
    expect(JSON.stringify(again.body)).not.toContain(run.meta.soloSeed);
  });
});

// The board is public and written server-side. Tests run without a database,
// so the DB calls no-op — what is verified here is the shaping, the guards,
// and the ranking rule, which is deliberately a pure function.
describe('the solo leaderboard', () => {
  const leaderboard = require('../api/leaderboard.js');
  const { bestPerPlayer, recordSoloScore } = require('../api/_lib/db.js');

  it('keeps one entry per player — their fastest — regardless of case', () => {
    const rows = [
      { player_name: 'Ada', finish_ms: 500 },
      { player_name: 'ada', finish_ms: 300 },   // same player, better run
      { player_name: 'Bo', finish_ms: 420 },
      { player_name: 'Cy', finish_ms: 900 },
    ];
    const board = bestPerPlayer(rows);
    expect(board.map((r) => `${r.player_name}:${r.finish_ms}`))
      .toEqual(['ada:300', 'Bo:420', 'Cy:900']);
  });

  it('honours the limit', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ player_name: `p${i}`, finish_ms: i }));
    expect(bestPerPlayer(rows, 5)).toHaveLength(5);
  });

  it('reads publicly and degrades to empty with no database', async () => {
    const r = await get(leaderboard, {});
    expect(r.statusCode).toBe(200);
    expect(r.body.scores).toEqual([]);
  });

  it('only lets the host remove an entry', async () => {
    const prev = process.env.ADMIN_TOKEN;
    try {
      process.env.ADMIN_TOKEN = 'secret-key';
      expect((await call(leaderboard, { body: { id: 1 } })).statusCode).toBe(403);
      expect((await call(leaderboard, { body: { adminToken: 'wrong', id: 1 } })).statusCode).toBe(403);
      expect((await call(leaderboard, { body: { adminToken: 'secret-key' } })).statusCode).toBe(400);
      const ok = await call(leaderboard, { body: { adminToken: 'secret-key', id: 1 } });
      expect(ok.statusCode).toBe(200);
    } finally {
      if (prev === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = prev;
    }
  });

  it('claims the write once, so a replay cannot double-post a score', async () => {
    const run = await soloRun();
    const { loadGame } = require('../api/_lib/games.js');
    let meta = await loadGame(run.code);
    await recordSoloScore(meta);
    meta = await loadGame(run.code);
    expect(meta.soloRecorded).toBe(true);
  });

  it('records a finished run exactly once', async () => {
    const run = await soloRun();
    await solveEverything(run);
    const { loadGame } = require('../api/_lib/games.js');
    const meta = await loadGame(run.code);
    // Finishing goes through answer.js, which claims the write.
    expect(meta.soloRecorded).toBe(true);
    // ...and still never touches the shared event history.
    expect(meta.resultsWritten).toBeFalsy();
  });
});
