# Adventure authoring guide

> **Where the files live.** This repository is public, so real adventures are
> committed only as ciphertext in `content/sealed/`. Author in
> `content/source/<slug>/index.js` (gitignored), then run `npm run seal` with
> `ADVENTURE_KEY` exported. The two fixtures in this directory stay plaintext
> as worked examples; anything registered in `index.js` here is public.
> Lost your working copy? `npm run unseal` rebuilds it from the ciphertext.
>
> Puzzle images in `public/puzzles/` are **not** sealed — browsers fetch them
> during play — so avoid putting an answer in a filename.

An adventure is one directory under `content/adventures/<slug>/` containing an
`index.js` module, registered in `content/adventures/index.js`. Puzzle images
go in `public/puzzles/<slug>/` and are referenced by URL.

**Answers, hints, and solve messages live ONLY in these modules.** They are
required exclusively by `api/_lib/content.js`, which strips them from every
player-facing response. Never import adventure modules from client code, and
never put answer text in image filenames (URLs are visible to players).

## Module shape

```js
module.exports = {
  slug: 'midnight-heist',      // must match the directory name
  title: 'The Midnight Heist', // shown to players
  hidden: false,               // true = excluded from /api/config listing (fixtures)
  intro: 'One paragraph of scene-setting shown in the lobby.',
  durationMin: 30,             // game clock
  puzzles: [
    {
      id: 'p1',                // stable, unique within the adventure
      title: 'The Doorman',    // shown to players
      type: 'wordplay',        // wordplay | image | cipher | logic | observation | meta
      prompt: '<p>Trusted HTML rendered on the player screen.</p>',
      media: ['/puzzles/midnight-heist/p1.jpg'],  // optional images
      answers: ['golden key'], // accepted answers; matching is normalized
                               // (lowercase, punctuation stripped, whitespace
                               // collapsed) on BOTH sides, so plain prose is fine
      answerPattern: null,     // optional regex (applied to the normalized guess,
                               // case-insensitive) as an alternative to answers
      answerInPrompt: false,   // set true ONLY for multiple-choice puzzles that
                               // must display the answer among the options;
                               // it exempts the puzzle from the leak test
      hints: [                 // revealed in order; each adds a one-time penalty
        { text: 'Nudge, not spoiler.', penaltySec: 60 },
        { text: 'Nearly the answer.', penaltySec: 90 },
      ],
      solveMessage: 'The vault code fragment is 7…', // shown on solve and kept
                               // visible after; the meta-puzzle assembles these
    },
  ],
};
```

## Design targets for a 30-minute adventure

- 10 puzzles: nine token puzzles then the meta. Ramp from a warm-up
  riddle (2–3 min) through mid-difficulty ciphers and logic to the hardest
  just before the finale.
- The final puzzle must be a meta that reuses all NINE earlier
  `solveMessage` tokens, so teams flip back through their solved history.
  `__tests__/content.test.js` re-solves every chain in CI — add an
  assertion there for any new adventure.
- Hosts can shorten a game to as few as 5 puzzles on the create form; a
  shortened game plays the first N puzzles and skips the meta, so front-load
  the strongest standalone puzzles.
- 2 hints per puzzle: first is a nudge (60s penalty), second nearly gives it
  away (90s penalty).
- Every puzzle must be solvable on a phone screen — test media legibility at
  ~375px wide.

## The Solo riddle bank

Solo runs are generated, but classic riddles need a human, so they come from a
bank rather than a generator.

- Author in `content/solo-source/riddles.js` (**gitignored**), exporting
  `{ riddles: [{ q, answers[], hints: [{text, penaltySec}, …] }] }`.
- `npm run seal` encrypts it to `content/solo/riddles.enc`; `npm run unseal`
  recovers it. Both are a second pass in the same commands.
- It must NOT live under `content/source/` or `content/sealed/`: everything
  there is loaded as an adventure, and a bank in either place breaks
  `/api/config` and the content tests.
- Riddles must be **theme-neutral** — the generator dresses them in whichever
  room the run picked — and must never name a setting, character or prop.
- Riddles are optional: CI runs the E2E suite with no key, so the generator has
  to produce a complete run without them. Never make one structurally required.

## Translating a puzzle

Each puzzle may carry an `i18n` block. Presentation localizes; the machinery
does not.

```js
i18n: {
  es: {
    title: 'La Puerta de Servicio',
    prompt: '<p>…</p>',
    answers: ['tu nombre'],   // ADDITIVE — never replaces the authored answers
    hints: [{ text: '…' }, { text: '…' }],  // penalties are never localized
    solveMessage: '… “crew word — GLASS”.', // the mark stays byte-identical
  },
  pt: { … },
}
```

Rules, all enforced by `__tests__/i18n-content.test.js`:

- **Never translate a chain mark.** The finale reads marks out of earlier solve
  messages — `crew word — GLASS`, `sigil O — 2 drops`, `letter — N`,
  `tally — 3`, a Roman numeral. Translate one and the finale breaks in that
  language only. If a room uses capitals purely for emphasis and carries its
  chain in figures, set `marksAreDigitsOnly: true` on that puzzle's
  translation and the figures are still compared exactly.
- **Never translate an artefact.** Ciphertext, anagram tiles, acrostic lines
  and word-bank blanks are the puzzle, not prose. Translate the framing around
  them.
- **Answers are additive and language-independent.** `answersFor()` unions
  every language's answers, because the toggle is a display choice a player can
  flip mid-run.
- **A translated answer must not appear in its own translated prompt.** The
  leak test checks each language separately; a natural phrasing in one language
  can give the answer away where the English does not.
- **Translate all languages or none.** A half-translated adventure gives the
  player a toggle that only sometimes works.
- **Re-author what cannot survive.** A pun that only works in English (Today
  and Tomorrow both starting with T) should become a different question with
  the same answer and difficulty — not a literal translation of a broken joke.

Author translations in `content/source/<slug>/i18n.js` and merge them with
`withI18n()`; `npm run seal` captures the merged result.
