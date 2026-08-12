// The anti-spoiler contract: no answer, unrevealed hint, or unearned solve
// message may ever appear in a player-facing API response. The fixture's
// XYZZY-prefixed strings make leaks grep-able.
import { describe, it, expect } from 'vitest';
const {
  answer, hint, call, startedGame, playerState,
} = require('./helpers.js');

const leak = (res, needle) => JSON.stringify(res.body).includes(needle);

describe('no spoiler leaks', () => {
  it('player state before any progress contains no secrets', async () => {
    const { code, p1 } = await startedGame();
    const s = await playerState(code, p1);
    for (const needle of [
      'XYZZY-FIXTURE-ANSWER-ONE',
      'XYZZY-FIXTURE-ANSWER-TWO',
      'XYZZY-FIXTURE-HINT-ONE-A',
      'XYZZY-FIXTURE-HINT-ONE-B',
      'XYZZY-FIXTURE-HINT-TWO-A',
      'XYZZY-FIXTURE-SOLVEMSG-ONE',
      'answerPattern',
    ]) {
      expect(leak(s, needle), `leaked ${needle}`).toBe(false);
    }
    // Puzzle 2 must be entirely absent until reached.
    expect(leak(s, 'The Meta')).toBe(false);
  });

  it('taking hint 1 reveals exactly hint 1', async () => {
    const { code, p1 } = await startedGame();
    await call(hint, { body: { code, ...p1, puzzleId: 'p1' } });
    const s = await playerState(code, p1);
    expect(leak(s, 'XYZZY-FIXTURE-HINT-ONE-A')).toBe(true);
    expect(leak(s, 'XYZZY-FIXTURE-HINT-ONE-B')).toBe(false);
    expect(leak(s, 'XYZZY-FIXTURE-ANSWER-ONE')).toBe(false);
  });

  it('solving reveals that puzzle\'s solve message and nothing further', async () => {
    const { code, p1 } = await startedGame();
    await call(answer, { body: { code, ...p1, puzzleId: 'p1', guess: 'short' } });
    const s = await playerState(code, p1);
    expect(leak(s, 'XYZZY-FIXTURE-SOLVEMSG-ONE')).toBe(true);
    expect(leak(s, 'XYZZY-FIXTURE-ANSWER-TWO')).toBe(false);
    expect(leak(s, 'XYZZY-FIXTURE-HINT-TWO-A')).toBe(false);
  });

  it('a wrong guess response gives nothing away', async () => {
    const { code, p1 } = await startedGame();
    const a = await call(answer, {
      body: { code, ...p1, puzzleId: 'p1', guess: 'XYZZY-FIXTURE-ANSWER-ON' },
    });
    expect(a.body).toEqual({ correct: false });
  });

  it('the host view never contains raw answers either (safe to screen-share)', async () => {
    const { code, hostToken } = await startedGame();
    const { hostState } = require('./helpers.js');
    const s = await hostState(code, hostToken);
    expect(leak(s, 'XYZZY-FIXTURE-ANSWER-ONE')).toBe(false);
    expect(leak(s, 'XYZZY-FIXTURE-ANSWER-TWO')).toBe(false);
    expect(leak(s, 'XYZZY-FIXTURE-HINT-ONE-A')).toBe(false);
  });
});
