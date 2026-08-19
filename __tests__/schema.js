// Shared adventure-schema assertions.
//
// Authored adventures and generated Solo runs must satisfy exactly the same
// contract, so both suites call these rather than keeping parallel copies
// that would drift apart.
import { expect } from 'vitest';
const fs = require('fs');
const path = require('path');
const { checkAnswer, normalizeAnswer } = require('../api/_lib/games.js');

export function assertAdventureSchema(adv, label = adv?.slug) {
  expect(adv, `${label}: missing`).toBeTruthy();
  expect(adv.slug, `${label}: slug`).toBeTruthy();
  expect(adv.title, `${label}: title`).toBeTruthy();
  expect(adv.intro, `${label}: intro`).toBeTruthy();
  expect(adv.durationMin, `${label}: durationMin`).toBeGreaterThan(0);
  expect(adv.puzzles.length, `${label}: puzzles`).toBeGreaterThan(0);

  const ids = adv.puzzles.map((p) => p.id);
  expect(new Set(ids).size, `${label}: duplicate puzzle ids`).toBe(ids.length);

  for (const p of adv.puzzles) {
    expect(p.title, p.id).toBeTruthy();
    expect(p.prompt, p.id).toBeTruthy();
    expect(p.solveMessage, p.id).toBeTruthy();
    // Every puzzle must be answerable.
    expect((p.answers || []).length > 0 || p.answerPattern, p.id).toBeTruthy();
    for (const a of p.answers || []) {
      // An answer that normalizes away is unanswerable: checkAnswer refuses
      // an empty guess, so nothing a player types could ever match it.
      expect(normalizeAnswer(a), `${p.id}: answer "${a}" normalizes to nothing`)
        .not.toBe('');
      expect(checkAnswer(p, a), `${p.id}: answer "${a}" fails its own check`).toBe(true);
    }
    for (const h of p.hints || []) {
      expect(h.text, p.id).toBeTruthy();
      expect(h.penaltySec, p.id).toBeGreaterThan(0);
    }
  }
}

// A puzzle must not hand over its own answer. Multiple-choice and "read the
// label" puzzles legitimately print it and opt out via answerInPrompt.
export function assertNoAnswerLeaks(adv, label = adv?.slug) {
  for (const p of adv.puzzles) {
    if (p.answerInPrompt) continue;
    const surface = `${p.prompt} ${(p.hints || []).map((h) => h.text).join(' ')}`
      .toLowerCase();
    for (const a of p.answers || []) {
      // Short answers ("c", "32") appear legitimately as puzzle data.
      if (a.length < 5) continue;
      // Whole-word match: a prompt may say "shorter" when the answer is
      // "short" — the giveaway is the word itself, not a substring.
      const word = new RegExp(
        `\\b${a.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      );
      expect(word.test(surface), `${label}/${p.id} leaks "${a}"`).toBe(false);
    }
  }
}

export function assertMediaExists(adv, root = path.join(process.cwd(), 'public')) {
  for (const p of adv.puzzles) {
    for (const m of p.media || []) {
      expect(fs.existsSync(path.join(root, m)), `${p.id}: missing ${m}`).toBe(true);
    }
  }
}
