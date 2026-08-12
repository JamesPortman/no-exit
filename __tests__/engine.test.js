import { describe, it, expect } from 'vitest';
const {
  create, join, answer, hint, host,
  call, startedGame, playerState, hostState,
} = require('./helpers.js');

describe('game lifecycle', () => {
  it('rejects create with an unknown adventure or bad teams', async () => {
    expect((await call(create, { body: { adventureSlug: 'nope', teams: ['A'] } })).statusCode).toBe(400);
    expect((await call(create, { body: { adventureSlug: 'test-adventure', teams: [] } })).statusCode).toBe(400);
    expect((await call(create, {
      body: { adventureSlug: 'test-adventure', teams: ['A', 'B', 'C', 'D'] },
    })).statusCode).toBe(400);
  });

  it('plays a full two-team game through to the ranking', async () => {
    const { code, hostToken, p1, p2 } = await startedGame();

    // Lobby is over; both players see puzzle 1, sanitized.
    let s = await playerState(code, p1);
    expect(s.body.state).toBe('running');
    expect(s.body.team.puzzle.id).toBe('p1');
    expect(s.body.team.puzzle.hintCount).toBe(2);

    // Wrong answer counts and logs, doesn't advance.
    let a = await call(answer, {
      body: { code, ...p1, puzzleId: 'p1', guess: 'wrong-o' },
    });
    expect(a.body.correct).toBe(false);
    s = await playerState(code, p1);
    expect(s.body.team.wrongCount).toBe(1);
    expect(s.body.team.puzzleIdx).toBe(0);

    // Correct answer (normalization: case + punctuation) advances and returns
    // the solve message.
    a = await call(answer, {
      body: { code, ...p1, puzzleId: 'p1', guess: '  Short!! ' },
    });
    expect(a.body.correct).toBe(true);
    expect(a.body.solveMessage).toContain('vault digit');
    expect(a.body.finished).toBe(false);

    // Stale double-submit from a teammate is a no-op, not an error.
    a = await call(answer, {
      body: { code, ...p1, puzzleId: 'p1', guess: 'short' },
    });
    expect(a.statusCode).toBe(200);
    expect(a.body.stale).toBe(true);

    // Puzzle 2 accepts its regex pattern.
    a = await call(answer, {
      body: { code, ...p1, puzzleId: 'p2', guess: '42 META' },
    });
    expect(a.body.correct).toBe(true);
    expect(a.body.finished).toBe(true);

    // Red finished; Blue solves one. Ranking: Red first (2 solves), Blue second.
    await call(answer, { body: { code, ...p2, puzzleId: 'p1', guess: 'short' } });
    await call(host, { body: { code, hostToken, action: 'end' } });
    s = await playerState(code, p2);
    expect(s.body.state).toBe('finished');
    expect(s.body.ranking.map((r) => r.name)).toEqual(['Red', 'Blue']);
    expect(s.body.ranking[0].finished).toBe(true);
    expect(s.body.ranking[1].solved).toBe(1);
  });

  it('applies each hint penalty exactly once, in order', async () => {
    const { code, p1 } = await startedGame();

    let h = await call(hint, { body: { code, ...p1, puzzleId: 'p1' } });
    expect(h.body.hint).toContain('HINT-ONE-A');
    expect(h.body.penaltySec).toBe(60);

    h = await call(hint, { body: { code, ...p1, puzzleId: 'p1' } });
    expect(h.body.hint).toContain('HINT-ONE-B');
    expect(h.body.revealedHints).toHaveLength(2);

    h = await call(hint, { body: { code, ...p1, puzzleId: 'p1' } });
    expect(h.statusCode).toBe(400); // no third hint

    const s = await playerState(code, p1);
    expect(s.body.team.penaltyMs).toBe((60 + 90) * 1000);
    expect(s.body.team.revealedHints).toHaveLength(2);
  });

  it('enforces join validation and player identity', async () => {
    const { code, p1 } = await startedGame();
    expect((await call(join, { body: { code: 'ZZZZ', name: 'X', teamId: 't1' } })).statusCode).toBe(404);
    expect((await call(join, { body: { code, name: '', teamId: 't1' } })).statusCode).toBe(400);
    expect((await call(join, { body: { code, name: 'X', teamId: 't9' } })).statusCode).toBe(400);

    // Bad token can't read state or answer.
    const bad = { playerId: p1.playerId, token: 'forged' };
    expect((await playerState(code, bad)).statusCode).toBe(403);
    expect((await call(answer, { body: { code, ...bad, puzzleId: 'p1', guess: 'short' } })).statusCode).toBe(403);
  });

  it('blocks answers before start and while paused', async () => {
    const created = await call(create, {
      body: { adventureSlug: 'test-adventure', teams: ['Solo'] },
    });
    const { code, hostToken } = created.body;
    const p = (await call(join, { body: { code, name: 'Ann', teamId: 't1' } })).body;

    let a = await call(answer, { body: { code, ...p, puzzleId: 'p1', guess: 'short' } });
    expect(a.statusCode).toBe(400); // lobby

    await call(host, { body: { code, hostToken, action: 'start' } });
    await call(host, { body: { code, hostToken, action: 'pause' } });
    a = await call(answer, { body: { code, ...p, puzzleId: 'p1', guess: 'short' } });
    expect(a.statusCode).toBe(400); // paused
  });
});
