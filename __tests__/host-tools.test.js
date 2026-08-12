// Host tools added after launch: kick, the opt-in answer key, and the
// history endpoint's auth.
import { describe, it, expect } from 'vitest';
const historyHandler = require('../api/history.js');
const {
  host, call, get, state, startedGame, playerState, hostState,
} = require('./helpers.js');

describe('kick player', () => {
  it('removes the player and invalidates their session', async () => {
    const { code, hostToken, p2 } = await startedGame();
    const r = await call(host, {
      body: { code, hostToken, action: 'kick', playerId: p2.playerId },
    });
    expect(r.body.ok).toBe(true);

    // Kicked player can no longer read state...
    expect((await playerState(code, p2)).statusCode).toBe(403);
    // ...their roster entry is gone, and the log shows the kick.
    const h = await hostState(code, hostToken);
    expect(JSON.stringify(h.body.teams)).not.toContain('Bob');
    expect(h.body.host.log.some((e) => e.type === 'kick' && e.name === 'Bob')).toBe(true);
  });

  it('rejects unknown players and non-hosts', async () => {
    const { code, hostToken, p1 } = await startedGame();
    expect((await call(host, {
      body: { code, hostToken, action: 'kick', playerId: 'nope' },
    })).statusCode).toBe(400);
    expect((await call(host, {
      body: { code, hostToken: p1.token, action: 'kick', playerId: p1.playerId },
    })).statusCode).toBe(403);
  });
});

describe('answer key', () => {
  it('is absent by default and present only with answers=1 + hostToken', async () => {
    const { code, hostToken, p1 } = await startedGame();

    const plain = await hostState(code, hostToken);
    expect(plain.body.host.answerKey).toBeUndefined();

    const withKey = await get(state, { code, hostToken, answers: '1' });
    expect(withKey.body.host.answerKey).toHaveLength(2);
    expect(JSON.stringify(withKey.body.host.answerKey)).toContain('XYZZY-FIXTURE-ANSWER-ONE');

    // A player asking for answers=1 gets nothing extra.
    const sneaky = await get(state, {
      code, playerId: p1.playerId, token: p1.token, answers: '1',
    });
    expect(JSON.stringify(sneaky.body)).not.toContain('XYZZY-FIXTURE-ANSWER-ONE');
    expect(sneaky.body.host).toBeUndefined();
  });
});

describe('create overrides: duration and puzzle count', () => {
  const { create, join, answer } = require('./helpers.js');

  it('honors a custom duration and clamps absurd values', async () => {
    const made = await call(create, {
      body: { adventureSlug: 'test-adventure', teams: ['A'], durationMin: 45 },
    });
    const p = (await call(join, { body: { code: made.body.code, name: 'X', teamId: 't1' } })).body;
    const s = await playerState(made.body.code, p);
    expect(s.body.durationMs).toBe(45 * 60 * 1000);

    const wild = await call(create, {
      body: { adventureSlug: 'test-adventure', teams: ['A'], durationMin: 9999 },
    });
    const p2 = (await call(join, { body: { code: wild.body.code, name: 'Y', teamId: 't1' } })).body;
    const s2 = await playerState(wild.body.code, p2);
    expect(s2.body.durationMs).toBe(120 * 60 * 1000); // clamped to the max
  });

  it('clamps puzzle count to [5, the adventure\'s own length]', async () => {
    // The fixture is only 2 puzzles long, so every request floors to 2 —
    // the adventure's length always wins over the 5-puzzle minimum.
    for (const puzzleCount of [1, 5, 99]) {
      const made = await call(create, {
        body: { adventureSlug: 'test-adventure', teams: ['A'], puzzleCount },
      });
      expect(made.body.puzzleCount, `requested ${puzzleCount}`).toBe(2);
    }
    // Below the floor on a full adventure clamps up to 5, never lower.
    const tiny = await call(create, {
      body: { adventureSlug: 'test-long', teams: ['A'], puzzleCount: 2 },
    });
    expect(tiny.body.puzzleCount).toBe(5);

    // The full-length fixture honours a five-puzzle request.
    const short = await call(create, {
      body: { adventureSlug: 'test-long', teams: ['A'], puzzleCount: 5 },
    });
    const p = (await call(join, {
      body: { code: short.body.code, name: 'X', teamId: 't1' },
    })).body;
    const s = await playerState(short.body.code, p);
    expect(s.body.team.totalPuzzles).toBe(5);
  });

  it('a shortened game ends after puzzle N and hides the rest everywhere', async () => {
    // Truncation is one helper away from every consumer, so exercise it
    // directly rather than coupling this test to any adventure's answers.
    const { adventureFor } = require('../api/_lib/games.js');
    const full = adventureFor({ adventureSlug: 'test-long' });
    expect(full.puzzles).toHaveLength(10);

    const cut = adventureFor({ adventureSlug: 'test-long', puzzleCount: 6 });
    expect(cut.puzzles).toHaveLength(6);
    expect(cut.puzzles.map((p) => p.id)).toEqual(full.puzzles.slice(0, 6).map((p) => p.id));
    // The meta is gone from a shortened game, and the source module is intact.
    expect(cut.puzzles.at(-1).type).not.toBe('meta');
    expect(full.puzzles).toHaveLength(10);
  });

  it('the host answer key covers only the puzzles in play', async () => {
    const made = await call(create, {
      body: { adventureSlug: 'test-long', teams: ['A'], puzzleCount: 5 },
    });
    const { code, hostToken } = made.body;
    const key = await get(state, { code, hostToken, answers: '1' });
    expect(key.body.host.answerKey).toHaveLength(5);
  });
});

describe('off-tab telemetry', () => {
  it('grows monotonically, clamps junk, and reaches host + ranking views', async () => {
    const { code, hostToken, p1 } = await startedGame();

    await get(state, { code, playerId: p1.playerId, token: p1.token, awayMs: '5000' });
    let h = await hostState(code, hostToken);
    let alice = h.body.host.teams.flatMap((t) => t.players).find((p) => p.name === 'Alice');
    expect(alice.awayMs).toBe(5000);

    // A lower report never shrinks it; garbage and negatives are ignored.
    await get(state, { code, playerId: p1.playerId, token: p1.token, awayMs: '2000' });
    await get(state, { code, playerId: p1.playerId, token: p1.token, awayMs: '-50' });
    await get(state, { code, playerId: p1.playerId, token: p1.token, awayMs: 'banana' });
    h = await hostState(code, hostToken);
    alice = h.body.host.teams.flatMap((t) => t.players).find((p) => p.name === 'Alice');
    expect(alice.awayMs).toBe(5000);

    // Team total shows on the final ranking.
    await call(host, { body: { code, hostToken, action: 'end' } });
    const s = await playerState(code, p1);
    const red = s.body.ranking.find((r) => r.name === 'Red');
    expect(red.awayMs).toBe(5000);
    const blue = s.body.ranking.find((r) => r.name === 'Blue');
    expect(blue.awayMs).toBe(0);
  });
});

describe('history endpoint', () => {
  it('honors ADMIN_TOKEN and degrades gracefully without a database', async () => {
    const prev = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'secret-key';
    try {
      const denied = await call(historyHandler, { body: { adminToken: 'wrong' } });
      expect(denied.statusCode).toBe(403);
      const ok = await call(historyHandler, { body: { adminToken: 'secret-key' } });
      expect(ok.statusCode).toBe(200);
      expect(ok.body.games).toEqual([]); // no DATABASE_URL in tests
    } finally {
      if (prev === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = prev;
    }
  });
});
