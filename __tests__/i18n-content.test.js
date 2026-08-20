// Translated puzzle content must stay mechanically identical to the English
// master. Prose changes; the machinery does not.
//
// The chain is what makes this delicate: each solve message carries an
// uppercase mark, and the finale reads their initials. A translator who
// "helpfully" renders GLASS as VIDRIO silently breaks the finale for that
// language only — which no English-only test would ever catch.
import { describe, it, expect } from 'vitest';
import {
  listAdventures, getAdventure, localizeAdventure, localizePuzzle,
  answersFor, patternFor, langOf, LANGS,
} from '../api/_lib/content.js';
import { assertNoAnswerLeaks } from './schema.js';

const { normalizeAnswer, checkAnswer } = require('../api/_lib/games.js');

const slugs = listAdventures({ includeHidden: true }).map((a) => a.slug);
// A chain mark is whatever the finale reads back: an uppercase word
// (“crew word — GLASS”), a lone sigil letter (“sigil O — 2 drops”), or the
// quantity beside it. Capturing all three means a translator cannot quietly
// localize any of them.
// Uppercase words of two letters or more, any quantity, and a lone sigil
// letter — which is recognised by the dash that follows it, since a bare
// single capital would also match Portuguese's definite article “A”.
const digits = (s) => (String(s || '').match(/\d+/g) || []);
// Uppercase words of two letters or more, any quantity, and a lone mark
// letter on either side of its dash (“sigil O — 2 drops”, “letter — N”).
// A bare single capital is not enough on its own: Portuguese's definite
// article “A” would match it everywhere.
const marks = (s) => (
  String(s || '').match(/\b[A-Z]{2,}\b|\d+|[A-Z](?=\s*—)|(?<=—\s)[A-Z]\b/g) || []
);

describe('localization plumbing', () => {
  it('accepts only known languages, defaulting to English', () => {
    expect(langOf({ query: { lang: 'es' } })).toBe('es');
    expect(langOf({ body: { lang: 'pt' } })).toBe('pt');
    expect(langOf({ query: { lang: 'de' } })).toBe('en');
    expect(langOf({ query: {} })).toBe('en');
    expect(langOf({ query: { lang: '../../etc' } })).toBe('en');
  });

  it('unions answers across languages so switching mid-run cannot invalidate one', () => {
    const p = {
      id: 'x', answers: ['lantern'],
      i18n: { es: { answers: ['linterna'] }, pt: { answers: ['lanterna'] } },
    };
    const all = answersFor(p);
    expect(all).toEqual(expect.arrayContaining(['lantern', 'linterna', 'lanterna']));
    // …and the union is what the engine checks, in every language.
    for (const lang of LANGS) {
      const view = localizePuzzle(p, lang);
      for (const guess of ['lantern', 'linterna', 'lanterna']) {
        expect(checkAnswer(view, guess)).toBe(true);
      }
    }
  });

  it('composes answer patterns rather than letting a translation drop one', () => {
    const p = { id: 'x', answerPattern: '^7 4 1$', i18n: { es: { answerPattern: '^siete$' } } };
    const pat = patternFor(p);
    expect(new RegExp(pat, 'i').test('7 4 1')).toBe(true);
    expect(new RegExp(pat, 'i').test('siete')).toBe(true);
    expect(new RegExp(pat, 'i').test('nope')).toBe(false);
  });

  it('falls back field by field, so a partial translation never blanks a puzzle', () => {
    const p = {
      id: 'x', title: 'Door', prompt: '<p>en</p>', solveMessage: 'mark — GLASS',
      hints: [{ text: 'one', penaltySec: 60 }, { text: 'two', penaltySec: 90 }],
      i18n: { es: { title: 'Puerta', hints: [{ text: 'uno' }] } },
    };
    const es = localizePuzzle(p, 'es');
    expect(es.title).toBe('Puerta');
    expect(es.prompt).toBe('<p>en</p>');          // untranslated → English
    expect(es.hints[0].text).toBe('uno');
    expect(es.hints[1].text).toBe('two');          // untranslated → English
    expect(es.hints[0].penaltySec).toBe(60);       // penalties never localize
    expect(es.hints[1].penaltySec).toBe(90);
  });
});

describe.each(slugs)('%s — translated content', (slug) => {
  const adv = getAdventure(slug);
  const translated = LANGS.filter((l) => l !== 'en'
    && adv.puzzles.some((p) => p.i18n && p.i18n[l]));

  it('is translated into every supported language, or none', () => {
    // A half-translated adventure is worse than an untranslated one: the
    // player gets a language toggle that only sometimes works.
    if (!translated.length) return;
    expect(translated.sort()).toEqual(LANGS.filter((l) => l !== 'en').sort());
    for (const lang of translated) {
      const missing = adv.puzzles.filter((p) => !(p.i18n && p.i18n[lang]));
      expect(missing.map((p) => p.id)).toEqual([]);
    }
  });

  for (const lang of ['es', 'pt']) {
    describe(lang, () => {
      const L = () => localizeAdventure(adv, lang);

      it('keeps every chain mark exactly as authored', () => {
        if (!translated.includes(lang)) return;
        for (const [i, p] of L().puzzles.entries()) {
          const src = adv.puzzles[i];
          // Some rooms carry their chain in FIGURES and use capitals only for
          // emphasis (“the channel is EVEN”). Forcing an English capital into
          // Spanish prose to satisfy this check would be worse than the check.
          // A translation may say so — but it must say so explicitly, per
          // puzzle, and the figures are still compared exactly.
          const digitsOnly = src.i18n[lang].marksAreDigitsOnly;
          const pick = digitsOnly ? digits : marks;
          expect(pick(p.solveMessage), `${src.id} marks`).toEqual(pick(src.solveMessage));
        }
      });

      it('renders every puzzle with non-empty text', () => {
        if (!translated.includes(lang)) return;
        for (const p of L().puzzles) {
          expect(p.title, `${p.id} title`).toBeTruthy();
          expect(p.prompt, `${p.id} prompt`).toBeTruthy();
          expect(p.solveMessage, `${p.id} solveMessage`).toBeTruthy();
          expect(p.hints.length, `${p.id} hints`).toBe(
            (adv.puzzles.find((q) => q.id === p.id).hints || []).length,
          );
          for (const h of p.hints) expect(h.text).toBeTruthy();
        }
      });

      it('does not leak an answer into its own prompt or hints', () => {
        if (!translated.includes(lang)) return;
        assertNoAnswerLeaks(L());
      });

      it('still solves: every authored answer is accepted in this language', () => {
        if (!translated.includes(lang)) return;
        for (const p of L().puzzles) {
          const src = adv.puzzles.find((q) => q.id === p.id);
          for (const a of (src.answers || [])) {
            expect(checkAnswer(p, a), `${p.id} ← ${a}`).toBe(true);
          }
          for (const a of (p.answers || [])) {
            expect(normalizeAnswer(a), `${p.id} empty answer`).not.toBe('');
            expect(checkAnswer(p, a), `${p.id} ← ${a}`).toBe(true);
          }
        }
      });
    });
  }
});
