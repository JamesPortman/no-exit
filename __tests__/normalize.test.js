import { describe, it, expect } from 'vitest';
const { normalizeAnswer, checkAnswer } = require('../api/_lib/games.js');

describe('normalizeAnswer', () => {
  it.each([
    ['  Golden Key ', 'golden key'],
    ['GOLDEN-KEY', 'goldenkey'],
    ["it's   a\ttrap", 'its a trap'],
    ['café crème', 'cafe creme'],
    ['42!', '42'],
    ['', ''],
    [null, ''],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeAnswer(input)).toBe(expected);
  });
});

describe('checkAnswer', () => {
  const puzzle = { answers: ['Golden Key'], answerPattern: '^vault \\d{3}$' };
  it('matches any accepted answer after normalizing both sides', () => {
    expect(checkAnswer(puzzle, 'golden key')).toBe(true);
    expect(checkAnswer(puzzle, '  GOLDEN KEY!!')).toBe(true);
    expect(checkAnswer(puzzle, 'golden')).toBe(false);
  });
  it('falls back to the regex pattern', () => {
    expect(checkAnswer(puzzle, 'Vault 123')).toBe(true);
    expect(checkAnswer(puzzle, 'vault 12')).toBe(false);
  });
  it('never matches the empty guess', () => {
    expect(checkAnswer({ answers: [''] }, '   ')).toBe(false);
  });
  it('survives a malformed pattern', () => {
    expect(checkAnswer({ answers: [], answerPattern: '([' }, 'anything')).toBe(false);
  });
});
