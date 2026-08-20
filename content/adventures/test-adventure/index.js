// Tiny fixture adventure for unit/E2E tests. Not listed to real players
// (hidden: true). Answer strings are deliberately distinctive so leak tests
// can grep API responses for them.
//
// It carries a full `i18n` block on purpose: the sealed adventures are
// unavailable to E2E (which runs with no ADVENTURE_KEY), so this fixture is
// the only content that can prove the language toggle actually reaches puzzle
// text in a browser. It also serves as the worked example for authors —
// see content/adventures/_schema.md.
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
      i18n: {
        es: {
          title: 'Calentamiento',
          prompt: '<p>¿Qué palabra inglesa se acorta cuando le añades dos letras?</p>',
          // Additive: the English answers keep working too.
          answers: ['corta'],
          hints: [{ text: 'XYZZY-FIXTURE-HINT-ONE-A-ES' }, { text: 'XYZZY-FIXTURE-HINT-ONE-B-ES' }],
          // The vault digit is a chain mark and stays as authored.
          solveMessage: 'XYZZY-FIXTURE-SOLVEMSG-ONE: tu primer dígito es 4.',
        },
        pt: {
          title: 'Aquecimento',
          prompt: '<p>Que palavra inglesa encurta quando você acrescenta duas letras?</p>',
          answers: ['curta'],
          hints: [{ text: 'XYZZY-FIXTURE-HINT-ONE-A-PT' }, { text: 'XYZZY-FIXTURE-HINT-ONE-B-PT' }],
          solveMessage: 'XYZZY-FIXTURE-SOLVEMSG-ONE: seu primeiro dígito é 4.',
        },
      },
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
      i18n: {
        es: {
          title: 'El Meta',
          prompt: '<p>Combina todo lo que has aprendido.</p>',
          hints: [{ text: 'XYZZY-FIXTURE-HINT-TWO-A-ES' }],
          solveMessage: '¡Escapaste del fixture!',
        },
        pt: {
          title: 'O Meta',
          prompt: '<p>Combine tudo o que você aprendeu.</p>',
          hints: [{ text: 'XYZZY-FIXTURE-HINT-TWO-A-PT' }],
          solveMessage: 'Você escapou do fixture!',
        },
      },
    },
  ],
};
