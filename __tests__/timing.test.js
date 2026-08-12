// Clock-sensitive behavior: pause accounting, lazy expiry, penalties in the
// final time. Uses fake timers — handlers only ever read Date.now().
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const {
  answer, host, call, startedGame, playerState, hostState,
} = require('./helpers.js');

const MIN = 60 * 1000;

describe('timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T20:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('pause freezes the clock and resume accounts for it', async () => {
    const { code, hostToken, p1 } = await startedGame();

    vi.advanceTimersByTime(2 * MIN);
    await call(host, { body: { code, hostToken, action: 'pause' } });
    vi.advanceTimersByTime(10 * MIN); // long break, clock must not advance
    await call(host, { body: { code, hostToken, action: 'resume' } });
    vi.advanceTimersByTime(1 * MIN);

    const s = await playerState(code, p1);
    expect(s.body.state).toBe('running');
    expect(s.body.elapsedMs).toBe(3 * MIN);
    expect(s.body.remainingMs).toBe(2 * MIN); // fixture duration is 5 min
  });

  it('expires lazily on the next state read after time runs out', async () => {
    const { code, p1 } = await startedGame();
    vi.advanceTimersByTime(5 * MIN + 1);
    const s = await playerState(code, p1);
    expect(s.body.state).toBe('finished');
    expect(s.body.remainingMs).toBe(0);
    expect(s.body.ranking).toBeDefined();
    // And answers are now rejected.
    const a = await call(answer, { body: { code, ...p1, puzzleId: 'p1', guess: 'short' } });
    expect(a.statusCode).toBe(400);
  });

  it('pause time never counts toward the timer expiry', async () => {
    const { code, hostToken, p1 } = await startedGame();
    vi.advanceTimersByTime(4 * MIN);
    await call(host, { body: { code, hostToken, action: 'pause' } });
    vi.advanceTimersByTime(30 * MIN);
    await call(host, { body: { code, hostToken, action: 'resume' } });
    const s = await playerState(code, p1);
    expect(s.body.state).toBe('running'); // 4 of 5 minutes used
    expect(s.body.elapsedMs).toBe(4 * MIN);
  });

  it('ending while paused freezes elapsed at the pause point', async () => {
    const { code, hostToken, p1 } = await startedGame();
    vi.advanceTimersByTime(2 * MIN);
    await call(host, { body: { code, hostToken, action: 'pause' } });
    vi.advanceTimersByTime(7 * MIN);
    await call(host, { body: { code, hostToken, action: 'end' } });
    const s = await playerState(code, p1);
    expect(s.body.state).toBe('finished');
    expect(s.body.elapsedMs).toBe(2 * MIN);
  });

  it('hint penalties land in the adjusted finish time', async () => {
    const { code, p1 } = await startedGame();
    const { hint } = require('./helpers.js');
    vi.advanceTimersByTime(1 * MIN);
    await call(hint, { body: { code, ...p1, puzzleId: 'p1' } }); // +60s
    await call(answer, { body: { code, ...p1, puzzleId: 'p1', guess: 'short' } });
    vi.advanceTimersByTime(1 * MIN);
    await call(answer, { body: { code, ...p1, puzzleId: 'p2', guess: '42 meta' } });
    const s = await playerState(code, p1);
    // Finished at 2 min elapsed + 1 min penalty = 3 min adjusted.
    expect(s.body.team.finishedAtMs).toBe(3 * MIN);
  });
});
