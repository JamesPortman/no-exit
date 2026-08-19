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
const { FAMILIES, riddlePuzzle } = require('./families.js');
const { loadRiddles } = require('../riddles.js');

const TOKEN_PUZZLES = 6;   // plus the finale
const DURATION_MIN = 15;

// The finale: either the initials of six marks spelling a word, or the six
// marks read as a code. Both mirror mechanics used by the authored rooms.
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
      puzzle: {
        id: `p${n}`,
        title: 'The Last Door',
        type: 'meta',
        prompt:
          `<p>The way out carries six empty slots and a line in `
          + `${theme.keeper}’s hand:</p>`
          + '<p><em>“Six marks, six letters. Take the first letter of each, '
          + 'in the order you found them, and say the word.”</em></p>',
        media: [],
        answers: [target.toLowerCase()],
        answerPattern: null,
        hints: [
          { text: 'Your “Unlocked so far” list holds all six marks in order. Take each word’s first letter.', penaltySec: 60 },
          { text: `It begins ${target[0]}, ${target[1]}, ${target[2]}…`, penaltySec: 90 },
        ],
        solveMessage:
          'The slots fill, the lock gives, and the door opens onto ordinary '
          + `daylight. Whatever happened to ${theme.keeper}, it can wait until you are outside.`,
      },
    };
  }
  const digits = Array.from({ length: TOKEN_PUZZLES }, () => String(rng.int(0, 9)));
  const code = digits.join('');
  return {
    tokens: digits,
    puzzle: {
      id: `p${n}`,
      title: 'The Last Door',
      type: 'meta',
      prompt:
        '<p>The way out has a six-figure dial and a line scratched beside it:</p>'
        + '<p><em>“Six marks, in the order you found them. Nothing else will turn it.”</em></p>',
      media: [],
      answers: [code],
      answerPattern: `^${digits.join('\\s*')}$`,
      hints: [
        { text: 'Your “Unlocked so far” list holds all six marks, in order.', penaltySec: 60 },
        { text: `It begins ${digits[0]}, ${digits[1]}, ${digits[2]}…`, penaltySec: 90 },
      ],
      solveMessage:
        'Six figures, one click, and the door swings wide onto ordinary '
        + `daylight. Whatever happened to ${theme.keeper}, it can wait.`,
    },
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
    i18n: { es: theme.es, pt: theme.pt },
    hidden: false,
    durationMin: DURATION_MIN,
    puzzles,
  };
}

module.exports = { generate, TOKEN_PUZZLES, DURATION_MIN };
