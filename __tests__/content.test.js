// Schema validation for every available adventure — catches authoring
// mistakes (missing answers, duplicate ids, dead media links) in CI before
// they ruin an event night.
//
// The real adventures are sealed, so these tests see them only when
// ADVENTURE_KEY is set (a GitHub Actions secret in CI, an export locally).
// A clone without the key still runs everything against the plaintext
// fixture; the meta-chain suites below skip rather than fail.
import { describe, it, expect } from 'vitest';
import { assertAdventureSchema, assertNoAnswerLeaks, assertMediaExists } from './schema.js';
const fs = require('fs');
const path = require('path');
const { listAdventures, getAdventure } = require('../api/_lib/content.js');
const { keyFromEnv } = require('../api/_lib/seal.js');
const { checkAnswer } = require('../api/_lib/games.js');

const SEALED_AVAILABLE = Boolean(keyFromEnv());
const ADVENTURES = Object.fromEntries(
  listAdventures({ includeHidden: true }).map((a) => [a.slug, getAdventure(a.slug)]),
);

// Guard: the sealed content must actually be reachable wherever the key is
// present, or these suites would silently shrink to the fixture alone.
describe("the host's adventure list", () => {
  it('hides the fixtures when there is real content, and falls back to them when there is not', () => {
    const { resetCache } = require('../api/_lib/content.js');
    const slugs = () => listAdventures().map((a) => a.slug);

    if (SEALED_AVAILABLE) {
      // Production: the fixtures are scaffolding, so hosts never see them.
      expect(slugs().some((s) => s.startsWith('test-'))).toBe(false);
      expect(slugs().length).toBeGreaterThan(0);
    }

    // A clone with no key has nothing else to play. An empty dropdown would
    // make the app look broken, so the fixtures surface instead.
    const key = process.env.ADVENTURE_KEY;
    try {
      delete process.env.ADVENTURE_KEY;
      resetCache();
      expect(slugs().sort()).toEqual(['test-adventure', 'test-long']);
    } finally {
      if (key === undefined) delete process.env.ADVENTURE_KEY;
      else process.env.ADVENTURE_KEY = key;
      resetCache();
    }
  });
});

describe('sealed content', () => {
  it('opens every sealed adventure when a key is available', () => {
    const sealedCount = fs.existsSync(path.join(__dirname, '..', 'content', 'sealed'))
      ? fs.readdirSync(path.join(__dirname, '..', 'content', 'sealed'))
          .filter((f) => f.endsWith('.enc')).length
      : 0;
    const fixtures = ['test-adventure', 'test-long'];
    if (!SEALED_AVAILABLE) {
      expect(Object.keys(ADVENTURES).sort()).toEqual(fixtures);
      return;
    }
    // both fixtures + every sealed file
    expect(Object.keys(ADVENTURES)).toHaveLength(sealedCount + fixtures.length);
  });

  it('ships no plaintext answers alongside the ciphertext', () => {
    const dir = path.join(__dirname, '..', 'content', 'sealed');
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(raw.startsWith('v1.'), `${f} is not a sealed envelope`).toBe(true);
      expect(/answers|solveMessage|hints/.test(raw), `${f} leaks structure`).toBe(false);
    }
  });
});

describe.each(Object.entries(ADVENTURES))('adventure %s', (key, adv) => {
  it('conforms to the schema', () => {
    expect(adv.slug).toBe(key);
    assertAdventureSchema(adv, key);
  });

  it('playable adventures are ten puzzles long', () => {
    if (adv.hidden) return; // fixtures are deliberately tiny
    expect(adv.puzzles.length).toBe(10);
  });

  it('playable adventures carry es + pt title/intro translations', () => {
    if (adv.hidden) return; // fixtures don't need i18n
    for (const lang of ['es', 'pt']) {
      expect(adv.i18n?.[lang]?.title?.trim(), `${key} ${lang} title`).toBeTruthy();
      expect(adv.i18n?.[lang]?.intro?.trim(), `${key} ${lang} intro`).toBeTruthy();
    }
  });

  it('no puzzle gives its own answer away in the prompt or hints', () => {
    assertNoAnswerLeaks(adv, key);
  });

  it('media files exist on disk', () => {
    assertMediaExists(adv);
  });
});

// Every adventure's meta-puzzle answer must be derivable from the tokens its
// own solve messages hand out — the chain a real team follows. These tests
// re-solve each finale from scratch, so an edit that breaks a chain cannot
// deploy.
const metaOf = (adv) => adv.puzzles[adv.puzzles.length - 1];
const tokens = (adv, re) =>
  adv.puzzles.slice(0, -1).map((p) => re.exec(p.solveMessage)?.[1]);

// Each finale is re-derived from the tokens its own puzzles hand out, so a
// broken chain fails the build. Needs the key: without it there is nothing
// but the fixture to solve.
describe.skipIf(!SEALED_AVAILABLE)('meta chains', () => {
  it('midnight-heist: nine crew-word initials spell the alias', () => {
    const adv = ADVENTURES['midnight-heist'];
    const words = tokens(adv, /crew word — ([A-Z]+)/);
    expect(words).toEqual([
      'GLASS', 'HALLWAY', 'OWL', 'SEVEN', 'TIDE',
      'LATCH', 'INKWELL', 'KEYSTONE', 'EMBER',
    ]);
    const alias = words.map((w) => w[0]).join('');
    expect(alias).toBe('GHOSTLIKE');
    expect(checkAnswer(metaOf(adv), alias)).toBe(true);
  });

  it('midnight-heist: the floor plan itself still spells the sweep order', () => {
    // The plan is a hand-drawn asset, so the puzzle can be broken by editing
    // the SVG alone — with the content module left perfectly valid. Read the
    // room codes and their figures straight out of the artwork.
    const svg = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'puzzles', 'midnight-heist', 'floor-plan.svg'), 'utf8');
    const texts = [...svg.matchAll(/<text x="(\d+)" y="(\d+)">([A-Z0-9])<\/text>/g)]
      .map((m) => ({ x: +m[1], y: +m[2], v: m[3] }));
    const row = (y) => (y < 200 ? 0 : y < 325 ? 1 : 2);
    const rooms = texts.filter((t) => /[A-Z]/.test(t.v)).map((L) => ({
      letter: L.v,
      n: texts.find((F) => /[0-9]/.test(F.v) && F.x === L.x && row(F.y) === row(L.y))?.v,
    }));
    expect(rooms.length, 'no rooms found in the plan').toBe(7);
    expect(rooms.every((r) => r.n), 'a room has no figure').toBe(true);
    const word = rooms.sort((a, b) => Number(b.n) - Number(a.n)).map((r) => r.letter).join('');
    expect(word).toBe('HALLWAY');
    const puzzle = ADVENTURES['midnight-heist'].puzzles.find((p) => p.id === 'gallery-map');
    expect(checkAnswer(puzzle, word)).toBe(true);
  });

  it('lighthouse-vigil: nine tallies form the lamp code', () => {
    const adv = ADVENTURES['lighthouse-vigil'];
    const digits = tokens(adv, /tally — (\d)/);
    expect(digits).toEqual(['3', '1', '4', '1', '5', '9', '2', '6', '5']);
    expect(checkAnswer(metaOf(adv), digits.join(''))).toBe(true);
  });

  it('last-carriage: nine of ten suspects cleared, the tenth is the thief', () => {
    const adv = ADVENTURES['last-carriage'];
    const cleared = adv.puzzles
      .flatMap((p) => [...p.solveMessage.matchAll(/The (\w+) is cleared/g)])
      .map((m) => m[1]);
    expect(cleared.sort()).toEqual([
      'Actress', 'Banker', 'Chef', 'Conductor', 'Diplomat',
      'Doctor', 'Porter', 'Stoker', 'Widow',
    ]);
    expect(cleared).not.toContain('Violinist');
    expect(checkAnswer(metaOf(adv), 'violinist')).toBe(true);
  });

  it('silent-observatory: nine plate letters anagram to the galaxy', () => {
    const adv = ADVENTURES['silent-observatory'];
    const letters = tokens(adv, /letter — ([A-Z])/);
    expect(letters).toHaveLength(9);
    expect([...letters].sort().join('')).toBe([...'ANDROMEDA'].sort().join(''));
    expect(checkAnswer(metaOf(adv), 'andromeda')).toBe(true);
  });

  it('curio-shop: nine tag-word initials name the bird', () => {
    const adv = ADVENTURES['curio-shop'];
    const words = tokens(adv, /“([A-Z]{3,})”/);
    expect(words).toEqual([
      'BERGAMOT', 'LODESTONE', 'AMBERGRIS', 'CLOVE', 'KELP',
      'BRASS', 'IVORY', 'ROSEWOOD', 'DAMSON',
    ]);
    const name = words.map((w) => w[0]).join('');
    expect(name).toBe('BLACKBIRD');
    expect(checkAnswer(metaOf(adv), name)).toBe(true);
  });

  it('alchemists-cellar: sigils sorted by drop count name the draught', () => {
    const adv = ADVENTURES['alchemists-cellar'];
    const pairs = adv.puzzles.slice(0, -1).map((p) => {
      const m = /sigil ([A-Z]) — (\d) drops?/.exec(p.solveMessage);
      return { letter: m?.[1], qty: Number(m?.[2]) };
    });
    expect(pairs).toHaveLength(9);
    // Quantities must be 1..9 with no ties, or the sort is ambiguous.
    expect([...pairs.map((p) => p.qty)].sort((a, b) => a - b))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const name = [...pairs].sort((a, b) => a.qty - b.qty)
      .map((p) => p.letter).join('');
    expect(name).toBe('MOONLIGHT');
    expect(checkAnswer(metaOf(adv), name)).toBe(true);
  });

  it('signal-deep: the nine scraps leave exactly one channel', () => {
    const adv = ADVENTURES['signal-deep'];
    const scraps = tokens(adv, /Scrap \w+ — “([^”]+)”/);
    expect(scraps.filter(Boolean)).toHaveLength(9);

    // The nine facts, as predicates. If a scrap's wording drifts away from
    // the fact it encodes, the puzzle text and this list disagree — which is
    // exactly the kind of break worth failing CI over, so keep them in sync.
    const digits = (n) => String(n).split('').map(Number);
    const facts = [
      (n) => n > 100,
      (n) => n % 2 === 0,
      (n) => new Set(digits(n)).size === digits(n).length,
      (n) => digits(n).reduce((a, b) => a + b, 0) === 12,
      (n) => digits(n).at(-1) === 6,
      (n) => digits(n).length === 3,
      (n) => digits(n)[0] % 2 === 1,
      (n) => digits(n).every((d, i, a) => i === 0 || a[i - 1] < d),
      (n) => n < 500,
    ];
    const candidates = [88, 156, 174, 243, 246, 332, 480, 516, 642, 850, 936, 1236];
    const survivors = candidates.filter((c) => facts.every((f) => f(c)));
    expect(survivors).toEqual([156]);

    // Every candidate the meta shows must actually be on the dial card.
    for (const c of candidates) {
      expect(metaOf(adv).prompt, `candidate ${c} missing`).toContain(String(c));
    }
    expect(checkAnswer(metaOf(adv), '156')).toBe(true);
  });

  it('clockmakers-attic: nine stopped hours read off the dial', () => {
    const adv = ADVENTURES['clockmakers-attic'];
    const hours = tokens(adv, /stopped at (\d+) o'clock/).map(Number);
    expect(hours).toEqual([4, 6, 2, 8, 5, 1, 7, 3, 10]);
    expect(new Set(hours).size).toBe(9); // the intro promises distinct hours

    const dial = {
      1: 'W', 2: 'O', 3: 'R', 4: 'C', 5: 'K', 6: 'L',
      7: 'O', 8: 'C', 9: 'A', 10: 'K', 11: 'N', 12: 'G',
    };
    for (const [pos, letter] of Object.entries(dial)) {
      expect(metaOf(adv).prompt, `dial ${pos}=${letter}`).toContain(`${pos}=${letter}`);
    }
    const word = hours.map((h) => dial[h]).join('');
    expect(word).toBe('CLOCKWORK');
    expect(checkAnswer(metaOf(adv), word)).toBe(true);
  });

  it('the-last-reel: nine canister numerals sum to the vault reel', () => {
    const adv = ADVENTURES['the-last-reel'];
    const numerals = tokens(adv, /canister marked ([IVXLC]+)/);
    expect(numerals).toEqual(['XII', 'VII', 'III', 'XX', 'VIII', 'IV', 'XV', 'IX', 'XXII']);
    const values = { I: 1, V: 5, X: 10, L: 50, C: 100 };
    const roman = (s) => [...s].reduce((sum, ch, i, a) =>
      sum + (values[ch] < values[a[i + 1]] ? -values[ch] : values[ch]), 0);
    const total = numerals.reduce((s, n) => s + roman(n), 0);
    expect(total).toBe(100);
    expect(checkAnswer(metaOf(adv), 'C')).toBe(true);
    expect(checkAnswer(metaOf(adv), String(total))).toBe(true);
  });

  it('cartographers-study: nine bearings walk the chart to Thornrock', () => {
    const adv = ADVENTURES['cartographers-study'];
    const bearings = tokens(adv, /bearing — ([A-Z]+)/);
    expect(bearings).toEqual([
      'WEST', 'NORTH', 'NORTH', 'EAST', 'NORTH',
      'WEST', 'WEST', 'SOUTH', 'NORTH',
    ]);
    // The chart grid as drawn in chart.svg: [row][col], A=0..D=3, row 1=0..4=3.
    const grid = [
      ['Thornrock', 'Gullhaven', 'Mistfen', 'Kelpgate'],
      ['Palebay', 'Saltmarsh', 'Foghollow', 'Wreckpoint'],
      ['Cinderkey', 'Lowlight', 'Brinemoor', 'Selkieshoal'],
      ['Duskharbor', 'Tidewrack', 'START', 'Emberledge'],
    ];
    let row = 3, col = 2; // the compass rose at C4
    for (const b of bearings) {
      if (b === 'NORTH') row -= 1;
      if (b === 'SOUTH') row += 1;
      if (b === 'WEST') col -= 1;
      if (b === 'EAST') col += 1;
      expect(row >= 0 && row < 4 && col >= 0 && col < 4, `walked off the chart at ${b}`).toBe(true);
    }
    expect(grid[row][col]).toBe('Thornrock');
    expect(checkAnswer(metaOf(adv), grid[row][col])).toBe(true);
  });
});
