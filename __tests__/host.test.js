import { describe, it, expect } from 'vitest';
const {
  host, hint, call, startedGame, playerState, hostState,
} = require('./helpers.js');

describe('host controls', () => {
  it('rejects host actions without the host token', async () => {
    const { code, p1 } = await startedGame();
    expect((await call(host, { body: { code, action: 'pause' } })).statusCode).toBe(403);
    expect((await call(host, {
      body: { code, hostToken: p1.token, action: 'pause' },
    })).statusCode).toBe(403);
    // And a player token cannot fetch the host view.
    const s = await hostState(code, p1.token);
    expect(s.statusCode).toBe(403);
  });

  it('free hint reveals without penalty; player hint then costs the next one', async () => {
    const { code, hostToken, teams, p1 } = await startedGame();
    await call(host, { body: { code, hostToken, action: 'freehint', teamId: teams[0].id } });
    let s = await playerState(code, p1);
    expect(s.body.team.revealedHints).toHaveLength(1);
    expect(s.body.team.penaltyMs).toBe(0);

    await call(hint, { body: { code, ...p1, puzzleId: 'p1' } });
    s = await playerState(code, p1);
    expect(s.body.team.revealedHints).toHaveLength(2);
    expect(s.body.team.penaltyMs).toBe(90 * 1000); // second hint's penalty
  });

  it('force-advance marks the puzzle solved and can finish a team', async () => {
    const { code, hostToken, teams, p1 } = await startedGame();
    await call(host, { body: { code, hostToken, action: 'advance', teamId: teams[0].id } });
    let s = await playerState(code, p1);
    expect(s.body.team.puzzleIdx).toBe(1);
    expect(s.body.team.solved[0].forced).toBe(true);

    await call(host, { body: { code, hostToken, action: 'advance', teamId: teams[0].id } });
    s = await playerState(code, p1);
    expect(s.body.team.finishedAtMs).not.toBeNull();

    const again = await call(host, {
      body: { code, hostToken, action: 'advance', teamId: teams[0].id },
    });
    expect(again.statusCode).toBe(400); // already finished
  });

  it('broadcast reaches player state; host view exposes team telemetry', async () => {
    const { code, hostToken, teams, p1 } = await startedGame();
    await call(host, {
      body: { code, hostToken, action: 'broadcast', message: 'Two minutes left!' },
    });
    const s = await playerState(code, p1);
    expect(s.body.broadcast.msg).toBe('Two minutes left!');

    const { answer } = require('./helpers.js');
    await call(answer, { body: { code, ...p1, puzzleId: 'p1', guess: 'red herring' } });
    const h = await hostState(code, hostToken);
    const red = h.body.host.teams.find((t) => t.id === teams[0].id);
    expect(red.wrongCount).toBe(1);
    expect(red.lastWrongGuesses).toEqual(['red herring']);
    expect(red.currentPuzzle.id).toBe('p1');
    expect(h.body.host.log.some((e) => e.type === 'wrong')).toBe(true);
  });

  it('start is lobby-only; unknown actions are rejected', async () => {
    const { code, hostToken } = await startedGame();
    expect((await call(host, { body: { code, hostToken, action: 'start' } })).statusCode).toBe(400);
    expect((await call(host, { body: { code, hostToken, action: 'explode' } })).statusCode).toBe(400);
  });
});
