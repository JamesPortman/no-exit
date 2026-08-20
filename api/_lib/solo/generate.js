// Generator for Solo runs: a pure function of a seed.
//
// generate(seed) always returns byte-identical content for the same seed —
// there is no Math.random, no Date.now, no I/O beyond the (memoized) riddle
// bank. That is what makes the run reproducible from `meta.soloSeed` when
// debugging, and what the determinism test pins.
//
// The result is materialised once at creation and stored on the game record;
// nothing regenerates it per request. See api/_lib/games.js adventureFor().
const { makeRng } = require('./rng.js');
const { THEMES } = require('./themes.js');
const { TOKEN_WORDS, TARGETS } = require('./words.js');
const { FAMILIES, riddlePuzzle, build } = require('./families.js');
const { LEX } = require('./lang.js');
const { vocab } = require('./themes.js');
const { loadRiddles } = require('../riddles.js');

const TOKEN_PUZZLES = 6;   // plus the finale
const DURATION_MIN = 15;

// The finale: either the initials of six marks spelling a word, or the six
// marks read as a code. Both mirror mechanics used by the authored rooms.
//
// The target word and the token words are NOT translated. The mechanic is
// letters — the initials of the marks the player collected — so the answer is
// produced by the puzzle, not by vocabulary, exactly as in the authored rooms.
function buildFinale(rng, theme, n) {
  if (rng.next() < 0.5) {
    const target = rng.pick(TARGETS);
    const used = {};
    const tokens = [...target].map((ch) => {
      used[ch] = used[ch] || rng.shuffle(TOKEN_WORDS[ch]);
      return used[ch].shift();
    });
    return {
      tokens,
      puzzle: build({ theme, n }, {
        type: 'meta',
        answers: [target.toLowerCase()],
        render: (lang) => {
          const L = LEX[lang].finale; const v = vocab(theme, lang);
          return {
            title: L.title,
            prompt: L.initials.prompt({ keeper: v.keeper }),
            hints: [L.initials.nudge(), L.initials.nearly(target[0], target[1], target[2])],
            solveMessage: L.initials.solve(v.keeper),
          };
        },
      }),
    };
  }

  const digits = Array.from({ length: TOKEN_PUZZLES }, () => String(rng.int(0, 9)));
  const code = digits.join('');
  return {
    tokens: digits,
    puzzle: build({ theme, n }, {
      type: 'meta',
      answers: [code],
      answerPattern: `^${digits.join('\\s*')}$`,
      render: (lang) => {
        const L = LEX[lang].finale; const v = vocab(theme, lang);
        return {
          title: L.title,
          prompt: L.code.prompt(),
          hints: [L.code.nudge(), L.code.nearly(digits[0], digits[1], digits[2])],
          solveMessage: L.code.solve(v.keeper),
        };
      },
    }),
  };
}

function generate(seed) {
  const rng = makeRng(seed);
  const theme = rng.pick(THEMES);
  const bank = loadRiddles();

  const { tokens, puzzle: finale } = buildFinale(rng, theme, TOKEN_PUZZLES + 1);

  // Two riddles when the bank is open, one stand-in anagram when it is not;
  // the rest are mechanical families, each used at most once per run.
  const riddleSlots = bank.length >= 2 ? 2 : 1;
  const riddles = rng.sample(bank, riddleSlots);
  const mechanics = rng.sample(FAMILIES, TOKEN_PUZZLES - riddleSlots);
  const builders = rng.shuffle([
    ...mechanics.map((fn) => ({ fn })),
    ...Array.from({ length: riddleSlots }, (_, i) => ({ fn: riddlePuzzle, riddle: riddles[i] })),
  ]);

  const puzzles = builders.map((b, i) =>
    b.fn(rng, { theme, token: tokens[i], n: i + 1, riddle: b.riddle }));
  puzzles.push(finale);

  return {
    // Constant slug: the client sees this, and anything seed-derived here
    // would let a player regenerate the run and read every answer.
    slug: 'solo',
    title: theme.title,
    intro: theme.intro,
    // Title and intro only — the theme's es/pt blocks also carry the room
    // vocabulary the generator dresses puzzles in, which the client never needs.
    i18n: {
      es: { title: theme.es.title, intro: theme.es.intro },
      pt: { title: theme.pt.title, intro: theme.pt.intro },
    },
    hidden: false,
    durationMin: DURATION_MIN,
    puzzles,
  };
}

module.exports = { generate, TOKEN_PUZZLES, DURATION_MIN };
