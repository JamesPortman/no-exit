// Puzzle families for generated Solo runs.
//
// Each family is a pure function of (rng, ctx) and returns one puzzle in the
// standard adventure schema, translated into every supported language.
//
// The shape that makes that possible: a family consumes the rng ONCE to choose
// its data — which cipher, which numbers, which spot in the room — and then
// renders that same data through each language's lexicon. Language never
// touches the rng, so a run is the same room, with the same answer, whichever
// language it is read in. Anything drawn from the theme is chosen as an INDEX
// so every language indexes its own parallel vocabulary.
//
// Three rules every family must honour:
//   1. the answer must never appear in its own prompt or hints, unless the
//      puzzle sets answerInPrompt (multiple-choice / read-the-label puzzles);
//   2. answers need enough range that guessing inside the 15-per-minute
//      answer limit is not a strategy;
//   3. the mark in the solve message is never localized — the finale reads it
//      back, so a translated mark would break the run in that language alone.
const { SECRETS, PLACE_NAMES, DOUBLED, UNDOUBLED, ASCENDING } = require('./words.js');
const { vocab } = require('./themes.js');
const { LEX, SOLO_LANGS, contract, cap } = require('./lang.js');

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Theme picks are indices, not strings: the same index addresses the Spanish
// and Portuguese vocabulary, so the run stays one coherent room.
const spotIdx = (rng, ctx) => rng.int(0, ctx.theme.spots.length - 1);
const propIdx = (rng, ctx) => rng.int(0, ctx.theme.props.length - 1);
const sampleIdx = (rng, n, len) => rng.sample([...Array(len).keys()], n);

// Assemble a puzzle from a per-language render function. English is the
// top-level content; the others go in `i18n`, exactly as an authored
// adventure carries them, so the same server-side localization path serves
// generated and authored rooms alike.
function build(ctx, {
  type, answers, answerPattern = null, answerInPrompt = false,
  penalties = [60, 90], render,
}) {
  const one = (lang) => {
    const r = render(lang);
    const fix = (s) => contract(lang, s);
    return {
      title: fix(r.title),
      prompt: fix(r.prompt),
      hints: r.hints.map((text) => fix(text)),
      solveMessage: fix(r.solveMessage),
      answers: r.answers,
    };
  };

  const en = one('en');
  const puzzle = {
    id: `p${ctx.n}`,
    title: en.title,
    type,
    prompt: en.prompt,
    media: [],
    answers,
    answerPattern,
    hints: en.hints.map((text, i) => ({ text, penaltySec: penalties[i] })),
    solveMessage: en.solveMessage,
    i18n: {},
  };
  if (answerInPrompt) puzzle.answerInPrompt = true;

  for (const lang of SOLO_LANGS) {
    if (lang === 'en') continue;
    const r = one(lang);
    puzzle.i18n[lang] = {
      title: r.title,
      prompt: r.prompt,
      // Penalties never localize; content.js keeps the authored ones.
      hints: r.hints.map((text) => ({ text })),
      solveMessage: r.solveMessage,
      ...(r.answers ? { answers: r.answers } : {}),
    };
  }
  return puzzle;
}

// ── Cipher ────────────────────────────────────────────────────────────────
function cipherPuzzle(rng, ctx) {
  const secret = rng.pick(SECRETS);
  const scheme = rng.pick(['caesar', 'atbash', 'a1z26', 'reverse']);
  const up = secret.toUpperCase();
  let shown; let k = 0;

  if (scheme === 'caesar') {
    k = rng.int(1, 3);
    shown = [...up].map((c) => A[(A.indexOf(c) + k) % 26]).join('');
  } else if (scheme === 'atbash') {
    shown = [...up].map((c) => A[25 - A.indexOf(c)]).join('');
  } else if (scheme === 'a1z26') {
    shown = [...up].map((c) => A.indexOf(c) + 1).join(' · ');
  } else {
    shown = [...up].reverse().join('');
  }
  const si = spotIdx(rng, ctx); const pi = propIdx(rng, ctx);

  return build(ctx, {
    type: 'cipher',
    // The plaintext is an English word in every language: the mechanic
    // produces letters, not vocabulary, exactly as in the authored rooms.
    answers: [secret, `the ${secret}`],
    render: (lang) => {
      const L = LEX[lang]; const v = vocab(ctx.theme, lang);
      return {
        title: L.cipher.title,
        prompt: L.cipher.prompt({ keeper: v.keeper, how: L.cipher.how[scheme](k), shown }),
        hints: [L.cipher.nudge[scheme](k), L.cipher.nearly[scheme](up[0], up[1])],
        solveMessage: L.mark({
          lead: L.cipher.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
        }),
      };
    },
  });
}

// ── Number sequence ───────────────────────────────────────────────────────
function sequencePuzzle(rng, ctx) {
  const kind = rng.pick(['arithmetic', 'geometric', 'gaps', 'squares']);
  let seq; let answer; let param;

  if (kind === 'arithmetic') {
    const start = rng.int(3, 19); const step = rng.int(4, 13);
    seq = Array.from({ length: 5 }, (_, i) => start + i * step);
    answer = start + 5 * step; param = step;
  } else if (kind === 'geometric') {
    const start = rng.int(2, 5); const r = rng.pick([2, 3]);
    seq = Array.from({ length: 5 }, (_, i) => start * r ** i);
    answer = start * r ** 5; param = r;
  } else if (kind === 'gaps') {
    const start = rng.int(2, 9); let cur = start; const out = [cur];
    for (let i = 1; i < 5; i++) { cur += i + 1; out.push(cur); }
    seq = out; answer = cur + 6;
  } else {
    const start = rng.int(2, 6);
    seq = Array.from({ length: 5 }, (_, i) => (start + i) ** 2);
    answer = (start + 5) ** 2; param = start;
  }
  const si = spotIdx(rng, ctx); const pi = propIdx(rng, ctx);

  return build(ctx, {
    type: 'logic',
    answers: [String(answer)],
    render: (lang) => {
      const L = LEX[lang]; const v = vocab(ctx.theme, lang);
      return {
        title: L.sequence.title,
        prompt: L.sequence.prompt({
          keeper: v.keeper, spot: v.spots[si], seq: seq.join(' &nbsp; '),
        }),
        hints: [L.sequence.nudge[kind](), L.sequence.nearly[kind](param)],
        solveMessage: L.mark({
          lead: L.sequence.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
        }),
      };
    },
  });
}

// ── Story arithmetic ──────────────────────────────────────────────────────
function storyPuzzle(rng, ctx) {
  const kind = rng.pick(['split', 'pond', 'gears', 'sumdiff']);
  let answer; let args;

  if (kind === 'split') {
    const small = rng.int(4, 15); const k = rng.int(2, 4);
    args = { k, total: small * (k + 1) };
    answer = small;
  } else if (kind === 'pond') {
    const day = rng.int(14, 40);
    args = { day };
    answer = day - 1;
  } else if (kind === 'gears') {
    const pinion = rng.pick([12, 15, 20, 25]); const turns = rng.int(3, 6);
    args = { pinion, teeth: pinion * turns };
    answer = turns;
  } else {
    const b = rng.int(6, 24); const d = rng.int(4, 20);
    args = { s: 2 * b + d, d };
    answer = b;
  }
  const si = spotIdx(rng, ctx); const pi = propIdx(rng, ctx);

  return build(ctx, {
    type: 'logic',
    answers: [String(answer)],
    render: (lang) => {
      const L = LEX[lang]; const v = vocab(ctx.theme, lang); const S = L.story[kind];
      return {
        title: S.title,
        prompt: L.story.prompt({ spot: v.spots[si], body: S.body(args) }),
        hints: [S.nudge(), S.nearly(args)],
        solveMessage: L.mark({
          lead: L.story.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
        }),
      };
    },
  });
}

// ── Odd one out ───────────────────────────────────────────────────────────
// Replaces an earlier "count the marks" puzzle. Counting shapes was busywork
// rather than thinking — and the shapes were in the DOM, so it took one line
// of JavaScript to skip. Spotting a rule cannot be scraped.
function oddOneOutPuzzle(rng, ctx) {
  const ascending = (w) => [...w].every((c, i, a) => i === 0 || a[i - 1] < c);
  const doubled = (w) => /(.)\1/.test(w);
  const useAlpha = rng.next() < 0.5;

  let obey; let odd;
  if (useAlpha) {
    obey = rng.sample(ASCENDING, 7);
    odd = rng.pick(UNDOUBLED.filter((w) => !ascending(w)));
  } else {
    obey = rng.sample(DOUBLED, 7);
    odd = rng.pick(UNDOUBLED.filter((w) => !doubled(w)));
  }
  const shown = rng.shuffle([...obey, odd]);
  const rule = useAlpha ? 'alpha' : 'dbl';
  const si = spotIdx(rng, ctx); const pi = propIdx(rng, ctx);

  return build(ctx, {
    type: 'observation',
    // The answer is one of the words on display — that is the puzzle. The
    // words are letter-shape artefacts, so they are not translated.
    answerInPrompt: true,
    answers: [odd],
    render: (lang) => {
      const L = LEX[lang]; const v = vocab(ctx.theme, lang);
      return {
        title: L.odd.title,
        prompt: L.odd.prompt({
          keeper: v.keeper, spot: v.spots[si], shown: shown.join(' &nbsp; '),
        }),
        hints: [L.odd[rule].nudge(), L.odd[rule].nearly()],
        solveMessage: L.mark({
          lead: L.odd.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
        }),
      };
    },
  });
}

// ── Ledger with a smudge ──────────────────────────────────────────────────
function ledgerPuzzle(rng, ctx) {
  const rows = rng.int(4, 5);
  const entries = Array.from({ length: rows }, () => rng.int(12, 240));
  const missingIdx = rng.int(0, rows - 1);
  const missing = entries[missingIdx];
  const total = entries.reduce((a, b) => a + b, 0);
  const labelIdx = sampleIdx(rng, rows, ctx.theme.spots.length);
  const si = spotIdx(rng, ctx); const pi = propIdx(rng, ctx);

  return build(ctx, {
    type: 'logic',
    answers: [String(missing)],
    render: (lang) => {
      const L = LEX[lang]; const v = vocab(ctx.theme, lang);
      const body = entries.map((val, i) => {
        const label = v.spots[labelIdx[i]] || L.ledger.lineLabel(i + 1);
        const cell = i === missingIdx ? `<strong>— ${L.ledger.smudged} —</strong>` : val;
        return `<tr><td style="padding:3px 14px 3px 0">${cap(label)}</td>`
          + `<td style="text-align:right;font-family:monospace">${cell}</td></tr>`;
      }).join('');
      const table = '<table style="margin:10px 0;font-size:0.95rem">' + body
        + '<tr><td style="padding-top:8px;border-top:1px solid #4a5261">'
        + `${L.ledger.totalLabel}</td>`
        + '<td style="text-align:right;font-family:monospace;padding-top:8px;'
        + `border-top:1px solid #4a5261">${total}</td></tr></table>`;
      return {
        title: L.ledger.title,
        prompt: L.ledger.prompt({ keeper: v.keeper, table }),
        hints: [L.ledger.nudge(), L.ledger.nearly(total)],
        solveMessage: L.mark({
          lead: L.ledger.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
        }),
      };
    },
  });
}

// ── Path across a chart ───────────────────────────────────────────────────
function pathPuzzle(rng, ctx) {
  const names = rng.sample(PLACE_NAMES, 25);
  const grid = [0, 1, 2, 3, 4].map((r) => names.slice(r * 5, r * 5 + 5));
  let row = rng.int(1, 3); let col = rng.int(1, 3);
  const startRow = row; const startCol = col;
  const steps = rng.int(4, 6);
  const bearings = [];
  for (let i = 0; i < steps; i++) {
    const options = [];
    if (row > 0) options.push('NORTH');
    if (row < 4) options.push('SOUTH');
    if (col > 0) options.push('WEST');
    if (col < 4) options.push('EAST');
    const b = rng.pick(options);
    bearings.push(b);
    if (b === 'NORTH') row -= 1;
    if (b === 'SOUTH') row += 1;
    if (b === 'WEST') col -= 1;
    if (b === 'EAST') col += 1;
  }
  const answer = grid[row][col];
  const si = spotIdx(rng, ctx); const pi = propIdx(rng, ctx);

  const table = grid.map((r, ri) => '<tr>' + r.map((cell, ci) =>
    `<td style="border:1px solid #4a5261;padding:5px 7px;font-size:0.82rem;`
    + `${ri === startRow && ci === startCol ? 'color:#e0a83c;font-weight:700' : ''}">`
    + `${ri === startRow && ci === startCol ? '★ ' : ''}${cell}</td>`).join('') + '</tr>').join('');
  const chart = '<table style="border-collapse:collapse;margin:10px 0">' + table + '</table>';

  return build(ctx, {
    type: 'observation',
    // The destination is printed on the chart by design — that is the puzzle.
    // Place names are proper nouns and identical in every language, so the
    // answer is too.
    answerInPrompt: true,
    answers: [answer],
    render: (lang) => {
      const L = LEX[lang]; const v = vocab(ctx.theme, lang);
      const words = bearings.map((b) => L.path.bearings[b]);
      return {
        title: L.path.title,
        prompt: L.path.prompt({
          keeper: v.keeper, spot: v.spots[si], bearings: words.join(' · '), table: chart,
        }),
        hints: [L.path.nudge(), L.path.nearly(words[0], words[1])],
        solveMessage: L.mark({
          lead: L.path.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
        }),
      };
    },
  });
}

// ── Riddle (sealed bank) or anagram fallback ──────────────────────────────
function riddlePuzzle(rng, ctx) {
  const r = ctx.riddle;
  const si = spotIdx(rng, ctx); const pi = propIdx(rng, ctx);

  if (r) {
    // A bank entry may carry its own es/pt text. Where it does not, the
    // English question stands in for that language — a run is never blocked
    // on a riddle being translated.
    return build(ctx, {
      type: 'wordplay',
      answers: r.answers,
      penalties: (r.hints || []).map((h) => h.penaltySec),
      render: (lang) => {
        const L = LEX[lang]; const v = vocab(ctx.theme, lang);
        const t = (lang !== 'en' && r[lang]) || null;
        return {
          title: L.riddle.title,
          prompt: L.riddle.prompt({ keeper: v.keeper, spot: v.spots[si], q: (t && t.q) || r.q }),
          hints: (r.hints || []).map((h, i) => ((t && t.hints && t.hints[i]) || h.text)),
          solveMessage: L.mark({
            lead: L.riddle.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
          }),
          answers: t && t.answers ? t.answers : undefined,
        };
      },
    });
  }

  // No riddle bank (a clone with no key, or CI): a self-contained anagram
  // stands in, so a run is always complete.
  const secret = rng.pick(SECRETS);
  let scrambled = rng.shuffle([...secret.toUpperCase()]).join('');
  if (scrambled === secret.toUpperCase()) scrambled = [...scrambled].reverse().join('');

  return build(ctx, {
    type: 'wordplay',
    answers: [secret, `the ${secret}`],
    render: (lang) => {
      const L = LEX[lang]; const v = vocab(ctx.theme, lang);
      return {
        title: L.anagram.title,
        prompt: L.anagram.prompt({ spot: v.spots[si], scrambled }),
        hints: [
          L.anagram.nudge(),
          L.anagram.nearly({ first: secret[0].toUpperCase(), len: secret.length }),
        ],
        solveMessage: L.mark({
          lead: L.anagram.solve, spot: v.spots[si], prop: v.props[pi], token: ctx.token,
        }),
      };
    },
  });
}

const FAMILIES = [
  cipherPuzzle, sequencePuzzle, storyPuzzle, oddOneOutPuzzle, ledgerPuzzle, pathPuzzle,
];

module.exports = { FAMILIES, riddlePuzzle, build };
