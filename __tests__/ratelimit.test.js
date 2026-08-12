// Answer attempts are limited per team (15/min) so nobody brute-forces the
// puzzle box. Fake timers pin the test inside one rate-limit window.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const { answer, call, startedGame } = require('./helpers.js');

describe('answer rate limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Window start +1s so 15 attempts comfortably fit inside one window.
    vi.setSystemTime(new Date(Math.ceil(Date.now() / 60000) * 60000 + 1000));
  });
  afterEach(() => vi.useRealTimers());

  it('allows 15 attempts per minute per team, then 429s, then resets', async () => {
    const { code, p1, p2 } = await startedGame();

    for (let i = 0; i < 15; i++) {
      const r = await call(answer, {
        body: { code, ...p1, puzzleId: 'p1', guess: `nope ${i}` },
      });
      expect(r.statusCode).toBe(200);
    }
    const blocked = await call(answer, {
      body: { code, ...p1, puzzleId: 'p1', guess: 'nope 16' },
    });
    expect(blocked.statusCode).toBe(429);

    // The other team is unaffected...
    const other = await call(answer, {
      body: { code, ...p2, puzzleId: 'p1', guess: 'also nope' },
    });
    expect(other.statusCode).toBe(200);

    // ...and the window rolls over.
    vi.advanceTimersByTime(2 * 60 * 1000);
    const after = await call(answer, {
      body: { code, ...p1, puzzleId: 'p1', guess: 'short' },
    });
    expect(after.statusCode).toBe(200);
    expect(after.body.correct).toBe(true);
  });
});
