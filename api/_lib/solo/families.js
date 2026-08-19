// Puzzle families for generated Solo runs.
//
// Each family is a pure function of (rng, ctx) and returns one puzzle in the
// standard adventure schema. `ctx.token` is the mark this puzzle hands the
// player for the finale; it is unrelated to the puzzle's own answer, so
// emitting it never leaks anything.
//
// Two rules every family must honour:
//   1. the answer must never appear in its own prompt or hints, unless the
//      puzzle sets answerInPrompt (multiple-choice / read-the-label puzzles);
//   2. answers need enough range that guessing inside the 15-per-minute
//      answer limit is not a strategy.
const { SECRETS, PLACE_NAMES } = require('./words.js');

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MONO = 'font-family:monospace;font-size:1.2rem;letter-spacing:0.1em';

// Where this puzzle's mark turns up, in the run's own vocabulary.
function solveLine(rng, ctx, lead) {
  const spot = rng.pick(ctx.theme.spots);
  const prop = rng.pick(ctx.theme.props);
  return `${lead} Behind ${spot}, ${prop} reads “mark — ${ctx.token}”.`;
}

const hint = (text, penaltySec) => ({ text, penaltySec });

// ── Cipher ────────────────────────────────────────────────────────────────
function cipherPuzzle(rng, ctx) {
  const secret = rng.pick(SECRETS);
  const scheme = rng.pick(['caesar', 'atbash', 'a1z26', 'reverse']);
  const up = secret.toUpperCase();
  let shown; let how; let nudge; let nearly;

  if (scheme === 'caesar') {
    const k = rng.int(1, 3);
    shown = [...up].map((c) => A[(A.indexOf(c) + k) % 26]).join('');
    how = `every letter nudged <strong>${k} place${k > 1 ? 's' : ''} forward</strong> in the alphabet`;
    nudge = `Step each letter back by ${k} and read it again.`;
    nearly = `The first letter steps back to ${up[0]}, the second to ${up[1]}.`;
  } else if (scheme === 'atbash') {
    shown = [...up].map((c) => A[25 - A.indexOf(c)]).join('');
    how = 'the alphabet folded end to end — A stands where Z should be';
    nudge = 'Write the alphabet forwards, then backwards underneath. Each letter swaps with the one below it.';
    nearly = `Folded back, the first two letters are ${up[0]} and ${up[1]}.`;
  } else if (scheme === 'a1z26') {
    shown = [...up].map((c) => A.indexOf(c) + 1).join(' · ');
    how = 'each letter traded for its place in the alphabet';
    nudge = '1 is A, 2 is B, and so on. Count to each number.';
    nearly = `The first number gives ${up[0]}, the second ${up[1]}.`;
  } else {
    shown = [...up].reverse().join('');
    how = 'written to be read from the wrong end';
    nudge = 'Read it right to left, last letter first.';
    nearly = `Reversed, it begins ${up[0]}${up[1]}.`;
  }

  return {
    id: `p${ctx.n}`,
    title: 'The Marked Line',
    type: 'cipher',
    prompt:
      `<p>${cap(ctx.theme.keeper)} kept one line in a private hand — `
      + `${how}:</p><p style="${MONO}">${shown}</p><p>What does it say?</p>`,
    media: [],
    answers: [secret, `the ${secret}`],
    answerPattern: null,
    hints: [hint(nudge, 60), hint(nearly, 90)],
    solveMessage: solveLine(rng, ctx, 'The line reads plainly once you turn it.'),
  };
}

// ── Number sequence ───────────────────────────────────────────────────────
function sequencePuzzle(rng, ctx) {
  const kind = rng.pick(['arithmetic', 'geometric', 'gaps', 'squares']);
  let seq; let answer; let nudge; let nearly;

  if (kind === 'arithmetic') {
    const start = rng.int(3, 19); const step = rng.int(4, 13);
    seq = Array.from({ length: 5 }, (_, i) => start + i * step);
    answer = start + 5 * step;
    nudge = 'The same amount is added every time.';
    nearly = `Each step adds ${step}.`;
  } else if (kind === 'geometric') {
    const start = rng.int(2, 5); const r = rng.pick([2, 3]);
    seq = Array.from({ length: 5 }, (_, i) => start * r ** i);
    answer = start * r ** 5;
    nudge = 'Each entry is a multiple of the one before it.';
    nearly = `Everything multiplies by ${r}.`;
  } else if (kind === 'gaps') {
    const start = rng.int(2, 9); let cur = start; const out = [cur];
    for (let i = 1; i < 5; i++) { cur += i + 1; out.push(cur); }
    seq = out; answer = cur + 6;
    nudge = 'Look at the gaps between the numbers, not the numbers themselves.';
    nearly = 'The gaps grow by one each time: +2, +3, +4, +5, then +6.';
  } else {
    const start = rng.int(2, 6);
    seq = Array.from({ length: 5 }, (_, i) => (start + i) ** 2);
    answer = (start + 5) ** 2;
    nudge = 'Every entry is a number multiplied by itself.';
    nearly = `They are the squares counting up from ${start}.`;
  }

  return {
    id: `p${ctx.n}`,
    title: 'The Tally',
    type: 'logic',
    prompt:
      `<p>A column of figures runs down ${rng.pick(ctx.theme.spots)}, `
      + `in ${ctx.theme.keeper}’s deliberate hand:</p>`
      + `<p style="${MONO}">${seq.join(' &nbsp; ')} &nbsp; ?</p>`
      + '<p>What comes next?</p>',
    media: [],
    answers: [String(answer)],
    answerPattern: null,
    hints: [hint(nudge, 60), hint(nearly, 90)],
    solveMessage: solveLine(rng, ctx, 'The column completes itself.'),
  };
}

// ── Story arithmetic ──────────────────────────────────────────────────────
function storyPuzzle(rng, ctx) {
  const kind = rng.pick(['split', 'pond', 'gears', 'sumdiff']);
  let body; let answer; let nudge; let nearly; let title;

  if (kind === 'split') {
    const small = rng.int(4, 15); const k = rng.int(2, 4);
    const total = small * (k + 1);
    title = 'The Two Vessels';
    body =
      `<ul><li>The larger holds <strong>${k} times</strong> as much as the smaller.</li>`
      + `<li>Together they hold <strong>${total}</strong> measures.</li></ul>`
      + '<p>How many measures are in the smaller one?</p>';
    answer = small;
    nudge = 'Count everything in units of the smaller vessel.';
    nearly = `That makes ${k + 1} small vessels in ${total} measures.`;
  } else if (kind === 'pond') {
    const day = rng.int(14, 40);
    title = 'The Doubling';
    body =
      `<p><em>“It doubles what it covers every day, and on day `
      + `${day} it covered the whole surface.”</em></p>`
      + '<p>On which day was exactly half of it covered?</p>';
    answer = day - 1;
    nudge = 'Do not work forward from the start — work backward from the end.';
    nearly = 'If it doubles daily, one day earlier it was exactly half.';
  } else if (kind === 'gears') {
    const small = rng.pick([12, 15, 20, 25]); const turns = rng.int(3, 6);
    title = 'The Meshed Wheels';
    body =
      `<p>The great wheel carries <strong>${small * turns} teeth</strong>, `
      + `the pinion <strong>${small}</strong>.</p>`
      + '<p>One full turn of the great wheel turns the pinion how many times?</p>';
    answer = turns;
    nudge = 'Every tooth of the big wheel pushes one tooth of the small one.';
    nearly = `All ${small * turns} teeth pass; the pinion swallows them ${small} at a time.`;
  } else {
    const b = rng.int(6, 24); const d = rng.int(4, 20);
    const s = 2 * b + d;
    title = 'The Uneven Pair';
    body =
      `<ul><li>Two counts come to <strong>${s}</strong> together.</li>`
      + `<li>One exceeds the other by <strong>${d}</strong>.</li></ul>`
      + '<p>What is the smaller count?</p>';
    answer = b;
    nudge = 'Take the difference off the total first, then the rest splits evenly.';
    nearly = `${s} minus ${d} is ${s - d}, shared equally between the two.`;
  }

  return {
    id: `p${ctx.n}`,
    title,
    type: 'logic',
    prompt: `<p>Chalked beside ${rng.pick(ctx.theme.spots)}:</p>${body}`,
    media: [],
    answers: [String(answer)],
    answerPattern: null,
    hints: [hint(nudge, 60), hint(nearly, 90)],
    solveMessage: solveLine(rng, ctx, 'The figures balance.'),
  };
}

// ── Counting ──────────────────────────────────────────────────────────────
function countingPuzzle(rng, ctx) {
  const total = rng.int(17, 44);
  const perRow = rng.int(6, 9);
  const rows = [];
  for (let i = 0; i < total; i += perRow) rows.push(Math.min(perRow, total - i));
  const svgRows = rows.map((count, r) =>
    Array.from({ length: count }, (_, c) =>
      `<rect x="${18 + c * 30}" y="${18 + r * 34}" width="18" height="22" rx="2" `
      + 'fill="#b98f3e" fill-opacity="0.55"/>').join(''),
  ).join('');
  const h = 24 + rows.length * 34;

  return {
    id: `p${ctx.n}`,
    title: 'The Stacked Marks',
    type: 'observation',
    prompt:
      `<p>${cap(ctx.theme.keeper)} tallied the store against ${rng.pick(ctx.theme.spots)} `
      + 'and never wrote the total down. Count them.</p>'
      + `<svg viewBox="0 0 ${18 + perRow * 30} ${h}" style="max-width:100%;height:auto">`
      + `<rect width="100%" height="100%" fill="#1c212b"/>${svgRows}</svg>`
      + '<p>How many marks are there?</p>',
    media: [],
    answers: [String(total)],
    answerPattern: null,
    hints: [
      hint('Count one row at a time — the rows are even except the last.', 60),
      hint(`There are ${rows.length} rows of ${perRow}, give or take the short one at the bottom.`, 90),
    ],
    solveMessage: solveLine(rng, ctx, 'The tally agrees.'),
  };
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

  const table = grid.map((r, ri) => '<tr>' + r.map((cell, ci) =>
    `<td style="border:1px solid #4a5261;padding:5px 7px;font-size:0.82rem;`
    + `${ri === startRow && ci === startCol ? 'color:#e0a83c;font-weight:700' : ''}">`
    + `${ri === startRow && ci === startCol ? '★ ' : ''}${cell}</td>`).join('') + '</tr>').join('');

  return {
    id: `p${ctx.n}`,
    title: 'The Chart',
    type: 'observation',
    // The destination is printed on the chart by design — that is the puzzle.
    answerInPrompt: true,
    prompt:
      `<p>A chart is pinned above ${rng.pick(ctx.theme.spots)}. `
      + 'North is up. Start at the marked square (★) and follow '
      + `${ctx.theme.keeper}’s bearings, one square each:</p>`
      + `<p style="${MONO}">${bearings.join(' · ')}</p>`
      + '<table style="border-collapse:collapse;margin:10px 0">' + table + '</table>'
      + '<p>Where do you end up?</p>',
    media: [],
    answers: [answer],
    answerPattern: null,
    hints: [
      hint('North is up, south is down, west is left, east is right — one square per bearing.', 60),
      hint(`From the star, the first two moves are ${bearings[0].toLowerCase()} then ${bearings[1].toLowerCase()}.`, 90),
    ],
    solveMessage: solveLine(rng, ctx, 'The chart gives up its corner.'),
  };
}

// ── Riddle (sealed bank) or anagram fallback ──────────────────────────────
function riddlePuzzle(rng, ctx) {
  const r = ctx.riddle;
  if (r) {
    return {
      id: `p${ctx.n}`,
      title: 'The Old Question',
      type: 'wordplay',
      prompt:
        `<p>Scratched into ${rng.pick(ctx.theme.spots)}, the question `
        + `${ctx.theme.keeper} asks everyone:</p><p><em>“${r.q}”</em></p>`,
      media: [],
      answers: r.answers,
      answerPattern: null,
      hints: r.hints,
      solveMessage: solveLine(rng, ctx, 'The old question yields.'),
    };
  }
  // No riddle bank (a clone with no key, or CI): a self-contained anagram
  // stands in, so a run is always complete.
  const secret = rng.pick(SECRETS);
  let scrambled = rng.shuffle([...secret.toUpperCase()]).join('');
  if (scrambled === secret.toUpperCase()) scrambled = [...scrambled].reverse().join('');
  return {
    id: `p${ctx.n}`,
    title: 'The Jumbled Tag',
    type: 'wordplay',
    prompt:
      `<p>A tag has come loose at ${rng.pick(ctx.theme.spots)} and its letters `
      + 'have shaken out of order:</p>'
      + `<p style="${MONO}">${scrambled}</p>`
      + '<p>What did the tag say?</p>',
    media: [],
    answers: [secret, `the ${secret}`],
    answerPattern: null,
    hints: [
      hint('Every letter is used exactly once — nothing added, nothing missing.', 60),
      hint(`It begins with ${secret[0].toUpperCase()} and runs ${secret.length} letters.`, 90),
    ],
    solveMessage: solveLine(rng, ctx, 'The letters settle.'),
  };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const FAMILIES = [cipherPuzzle, sequencePuzzle, storyPuzzle, countingPuzzle, pathPuzzle];

module.exports = { FAMILIES, riddlePuzzle, solveLine, cap };
