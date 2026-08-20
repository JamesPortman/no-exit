// Adventure loading + sanitizing. This module is the ONLY consumer of the
// content registry; everything it returns to callers that serve players must
// go through the sanitizers below so answers, hints, future puzzles, and
// solve messages never leak.
//
// Content arrives from two places. The fixture adventure is committed as
// plaintext — it documents the format and lets the engine's tests run in a
// clone with no key. The real adventures are committed only as ciphertext
// (content/sealed/*.enc) and need ADVENTURE_KEY to load; without it they are
// simply absent, which is a working install with nothing to play rather than
// a crash.
const fs = require('fs');
const path = require('path');
const { keyFromEnv, decrypt } = require('./seal.js');

const PLAINTEXT = require('../../content/adventures/index.js');
const SEALED_DIR = path.join(__dirname, '..', '..', 'content', 'sealed');

// Decrypt once per process; serverless instances reuse this across requests.
let cache = null;

function loadAll() {
  if (cache) return cache;
  const all = { ...PLAINTEXT };
  const key = keyFromEnv();
  if (key && fs.existsSync(SEALED_DIR)) {
    for (const file of fs.readdirSync(SEALED_DIR).filter((f) => f.endsWith('.enc'))) {
      const slug = file.replace(/\.enc$/, '');
      try {
        const raw = fs.readFileSync(path.join(SEALED_DIR, file), 'utf8');
        all[slug] = JSON.parse(decrypt(raw, key));
      } catch (e) {
        // A bad key or tampered file must never take the whole app down —
        // that adventure is unavailable and the reason is logged.
        console.error(`[content] could not open ${file}: ${e.message}`);
      }
    }
  }
  cache = all;
  return cache;
}

// Tests seal fresh fixtures mid-run; they call this to drop the cache.
function resetCache() {
  cache = null;
}

function getAdventure(slug) {
  return loadAll()[slug] || null;
}

// Listing for the create-game page. Fixtures are hidden while there is
// anything real to play; in a clone with no key they ARE the app, so they
// surface rather than leaving the host with an empty dropdown.
function listAdventures({ includeHidden = false } = {}) {
  const all = Object.values(loadAll());
  const playable = all.filter((a) => !a.hidden);
  const shown = includeHidden || !playable.length ? all : playable;
  return shown
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      intro: a.intro,
      i18n: a.i18n || null, // localized title/intro only — never puzzle content
      durationMin: a.durationMin,
      puzzleCount: a.puzzles.length,
    }));
}

// ---------------------------------------------------------------------------
// Localization.
//
// Puzzle content is authored in English and may carry a per-language `i18n`
// block. Two rules keep this honest:
//
//   1. Presentation localizes field by field, so a partly translated puzzle
//      degrades to English rather than to blanks.
//   2. ACCEPTED ANSWERS DO NOT LOCALIZE — they are the union across every
//      language. The interface language is a client-side toggle a player can
//      flip mid-run; an answer they already derived must not stop being
//      correct because they switched. It also keeps the host's crib sheet
//      complete without the host having to guess a team's language.
const LANGS = ['en', 'es', 'pt'];

function langOf(req) {
  const raw = (req.query && req.query.lang) || (req.body && req.body.lang) || 'en';
  const l = String(raw).slice(0, 2).toLowerCase();
  return LANGS.includes(l) ? l : 'en';
}

function answersFor(puzzle) {
  const out = [...(puzzle.answers || [])];
  for (const l of LANGS) {
    const t = puzzle.i18n && puzzle.i18n[l];
    if (t && t.answers) out.push(...t.answers);
  }
  return [...new Set(out)];
}

// Each authored pattern is anchored, so alternation composes them safely.
function patternFor(puzzle) {
  const pats = [puzzle.answerPattern];
  for (const l of LANGS) {
    const t = puzzle.i18n && puzzle.i18n[l];
    if (t && t.answerPattern) pats.push(t.answerPattern);
  }
  const kept = [...new Set(pats.filter(Boolean))];
  if (!kept.length) return null;
  return kept.length === 1 ? kept[0] : kept.map((x) => `(?:${x})`).join('|');
}

function localizePuzzle(puzzle, lang) {
  const t = lang && lang !== 'en' && puzzle.i18n ? puzzle.i18n[lang] : null;
  const base = { ...puzzle, answers: answersFor(puzzle), answerPattern: patternFor(puzzle) };
  if (!t) return base;
  const hints = (puzzle.hints || []).map((h, i) => {
    const th = t.hints && t.hints[i];
    return th ? { ...h, text: typeof th === 'string' ? th : th.text } : h;
  });
  return {
    ...base,
    title: t.title || puzzle.title,
    prompt: t.prompt || puzzle.prompt,
    solveMessage: t.solveMessage || puzzle.solveMessage,
    hints,
  };
}

// The adventure a player actually sees. Callers pass the language from the
// request; `en` returns content as authored (with answers still unioned).
function localizeAdventure(adventure, lang) {
  const t = lang && lang !== 'en' && adventure.i18n ? adventure.i18n[lang] : null;
  return {
    ...adventure,
    title: (t && t.title) || adventure.title,
    intro: (t && t.intro) || adventure.intro,
    puzzles: adventure.puzzles.map((p) => localizePuzzle(p, lang)),
  };
}

// Player-safe view of a single puzzle: no answers, no answerPattern, no hint
// text, no solveMessage.
function sanitizePuzzle(puzzle) {
  return {
    id: puzzle.id,
    title: puzzle.title,
    type: puzzle.type,
    prompt: puzzle.prompt,
    media: puzzle.media || [],
    hintCount: (puzzle.hints || []).length,
    hintPenaltiesSec: (puzzle.hints || []).map((h) => h.penaltySec),
  };
}

// Player-safe view of a team's position: current puzzle only, hint texts only
// up to the number already revealed, solve messages only for solved puzzles.
function playerView(adventure, teamState) {
  const idx = teamState.puzzleIdx;
  const current = idx < adventure.puzzles.length ? adventure.puzzles[idx] : null;
  return {
    puzzleIdx: idx,
    totalPuzzles: adventure.puzzles.length,
    puzzle: current ? sanitizePuzzle(current) : null,
    revealedHints: current
      ? (current.hints || [])
          .slice(0, teamState.hintsTaken[current.id] || 0)
          .map((h) => h.text)
      : [],
    solved: teamState.solves.map((s) => {
      const p = adventure.puzzles.find((pz) => pz.id === s.puzzleId);
      return {
        puzzleId: s.puzzleId,
        title: p ? p.title : s.puzzleId,
        solveMessage: p ? p.solveMessage : '',
        forced: s.forced || false,
      };
    }),
  };
}

module.exports = {
  getAdventure, listAdventures, sanitizePuzzle, playerView, resetCache,
  LANGS, langOf, answersFor, patternFor, localizePuzzle, localizeAdventure,
};
