// The generator produces content nobody reviews before a player sees it, so
// these properties stand in for the hand-written chain tests the authored
// adventures get. Every run over many seeds must be schema-valid, solvable,
// spoiler-free, and reproducible.
import { describe, it, expect } from 'vitest';
import { assertAdventureSchema, assertNoAnswerLeaks } from './schema.js';
const crypto = require('crypto');
const { generate, TOKEN_PUZZLES } = require('../api/_lib/solo/generate.js');
const { resetRiddleCache } = require('../api/_lib/riddles.js');
const { checkAnswer } = require('../api/_lib/games.js');
const { keyFromEnv } = require('../api/_lib/seal.js');

// Bump deliberately when the generator changes on purpose.
const EXPECTED_FINGERPRINT = '1a99c07ce294e861';

const SEEDS = Array.from({ length: 200 }, (_, i) => `seed-${i}`);
const MARK = /“mark — ([A-Z0-9]+)”/;

// Generate as a clone with no ADVENTURE_KEY would — the state CI's E2E job
// and any fork runs in.
function generateKeyless(seed) {
  const key = process.env.ADVENTURE_KEY;
  try {
    delete process.env.ADVENTURE_KEY;
    resetRiddleCache();
    return generate(seed);
  } finally {
    if (key === undefined) delete process.env.ADVENTURE_KEY;
    else process.env.ADVENTURE_KEY = key;
    resetRiddleCache();
  }
}

describe('solo generator', () => {
  it('is deterministic, and pinned for a fixed seed', () => {
    expect(JSON.stringify(generate('fixed'))).toBe(JSON.stringify(generate('fixed')));
    // A committed fingerprint, so changing the generator is a deliberate,
    // reviewed diff rather than a silent content change. Taken keyless so it
    // does not move when the riddle bank is edited.
    const fp = crypto.createHash('sha256')
      .update(JSON.stringify(generateKeyless('fingerprint-seed'))).digest('hex').slice(0, 16);
    expect(fp).toBe(EXPECTED_FINGERPRINT);
  });

  it('distinct seeds produce distinct runs', () => {
    const seen = new Set(SEEDS.slice(0, 60).map((s) => JSON.stringify(generate(s))));
    expect(seen.size).toBeGreaterThan(50); // themes collide sometimes; content should not
  });

  it.each([true, false])('every run is schema-valid and spoiler-free (keyed=%s)', (keyed) => {
    if (keyed && !keyFromEnv()) return; // no key available in this environment
    for (const seed of SEEDS) {
      const adv = keyed ? generate(seed) : generateKeyless(seed);
      assertAdventureSchema(adv, seed);
      assertNoAnswerLeaks(adv, seed);
      expect(adv.puzzles, seed).toHaveLength(TOKEN_PUZZLES + 1);
      expect(adv.slug, seed).toBe('solo'); // never seed-derived
    }
  });

  it('every finale is derivable from the marks its own puzzles hand out', () => {
    for (const seed of SEEDS) {
      const adv = generate(seed);
      const marks = adv.puzzles.slice(0, -1).map((p) => MARK.exec(p.solveMessage)?.[1]);
      expect(marks.filter(Boolean), `${seed}: every puzzle must emit a mark`)
        .toHaveLength(TOKEN_PUZZLES);

      const meta = adv.puzzles.at(-1);
      const derived = /^\d+$/.test(marks[0])
        ? marks.join('')                                   // six-figure dial
        : marks.map((m) => m[0]).join('').toLowerCase();   // initials
      expect(checkAnswer(meta, derived), `${seed}: finale not derivable`).toBe(true);
    }
  });

  it('a run without the riddle bank is still complete', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const adv = generateKeyless(seed);
      expect(adv.puzzles).toHaveLength(TOKEN_PUZZLES + 1);
      assertAdventureSchema(adv, seed);
    }
  });

  it('stays small enough to live on the game record', () => {
    for (const seed of SEEDS) {
      expect(JSON.stringify(generate(seed)).length, seed).toBeLessThan(24_000);
    }
  });

  it('never embeds the seed in anything the client could see', () => {
    for (const seed of ['abcdef0123456789', 'zzz-secret-seed']) {
      expect(JSON.stringify(generate(seed))).not.toContain(seed);
    }
  });
});

// The repo is public, so the bank must ship as ciphertext only. Mirrors the
// same guard the sealed adventures get.
describe('the sealed riddle bank', () => {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(process.cwd(), 'content', 'solo');

  it('ships no readable riddles alongside the ciphertext', () => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(raw.startsWith('v1.'), `${f} is not a sealed envelope`).toBe(true);
      expect(/answers|hints|penaltySec/.test(raw), `${f} leaks structure`).toBe(false);
    }
  });

  it('opens and is big enough that repeats are rare', () => {
    const { loadRiddles } = require('../api/_lib/riddles.js');
    const bank = loadRiddles();
    if (!keyFromEnv()) {
      expect(bank).toEqual([]); // keyless clones simply have no riddles
      return;
    }
    expect(bank.length).toBeGreaterThanOrEqual(40);
    const answers = new Set(bank.map((r) => r.answers[0].toLowerCase()));
    expect(answers.size).toBe(bank.length); // no two riddles share a solution
  });
});
