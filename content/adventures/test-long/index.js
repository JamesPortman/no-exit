// A full-length fixture: ten puzzles with the same shape as a real
// adventure, so the engine's length-dependent behaviour (puzzle-count
// clamping, shortened games, the meta finale) stays under test in a clone
// with no ADVENTURE_KEY. Hidden from the create form like the short fixture.
//
// Deliberately trivial content — the real adventures are sealed. Answers
// here are the puzzle's own index, and each solve message hands out a token
// so the meta chain is exercised end to end.
const puzzles = Array.from({ length: 9 }, (_, i) => {
  const n = i + 1;
  return {
    id: `p${n}`,
    title: `Fixture Puzzle ${n}`,
    type: 'logic',
    prompt: `<p>Type the number ${n}.</p>`,
    media: [],
    answers: [String(n)],
    answerPattern: null,
    hints: [
      { text: `FIXTURE-LONG-HINT-${n}-A`, penaltySec: 60 },
      { text: `FIXTURE-LONG-HINT-${n}-B`, penaltySec: 90 },
    ],
    solveMessage: `FIXTURE-LONG-SOLVE-${n}: token ${n}.`,
  };
});

puzzles.push({
  id: 'p10',
  title: 'Fixture Meta',
  type: 'meta',
  prompt: '<p>Type the nine tokens in order.</p>',
  media: [],
  answers: ['123456789'],
  answerPattern: null,
  hints: [{ text: 'FIXTURE-LONG-HINT-10-A', penaltySec: 60 }],
  solveMessage: 'Fixture complete.',
});

module.exports = {
  slug: 'test-long',
  title: 'Test Adventure (Full Length)',
  hidden: true,
  intro: 'A ten-puzzle fixture for automated tests.',
  durationMin: 50,
  puzzles,
};
