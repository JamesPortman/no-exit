// Tiny fixture adventure for unit/E2E tests. Not listed to real players
// (hidden: true). Answer strings are deliberately distinctive so leak tests
// can grep API responses for them.
module.exports = {
  slug: 'test-adventure',
  title: 'Test Adventure',
  hidden: true,
  intro: 'A two-puzzle fixture for automated tests.',
  durationMin: 5,
  puzzles: [
    {
      id: 'p1',
      title: 'Warm-up',
      type: 'wordplay',
      prompt: '<p>What word becomes shorter when you add two letters to it?</p>',
      media: [],
      answers: ['XYZZY-FIXTURE-ANSWER-ONE', 'short'],
      answerPattern: null,
      hints: [
        { text: 'XYZZY-FIXTURE-HINT-ONE-A', penaltySec: 60 },
        { text: 'XYZZY-FIXTURE-HINT-ONE-B', penaltySec: 90 },
      ],
      solveMessage: 'XYZZY-FIXTURE-SOLVEMSG-ONE: your first vault digit is 4.',
    },
    {
      id: 'p2',
      title: 'The Meta',
      type: 'meta',
      prompt: '<p>Combine everything you have learned.</p>',
      media: [],
      answers: ['XYZZY-FIXTURE-ANSWER-TWO'],
      answerPattern: '^42\\s*meta$',
      hints: [{ text: 'XYZZY-FIXTURE-HINT-TWO-A', penaltySec: 60 }],
      solveMessage: 'You escaped the fixture!',
    },
  ],
};
