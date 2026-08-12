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

## Design targets for a 50-minute adventure

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
