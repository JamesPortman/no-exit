// The i18n dictionaries live in a browser script; parse it and check the
// three locales stay in lockstep and placeholders survive translation.
import { describe, it, expect } from 'vitest';
const fs = require('fs');
const path = require('path');

// Evaluate just the MESSAGES literal out of the browser file.
const src = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
const literal = src.slice(src.indexOf('const MESSAGES ='), src.indexOf('const LANGS ='));
const MESSAGES = new Function(`${literal}; return MESSAGES;`)();

describe('i18n dictionaries', () => {
  const locales = Object.keys(MESSAGES);

  it('covers en, es, pt', () => {
    expect(locales.sort()).toEqual(['en', 'es', 'pt']);
  });

  it('every locale has exactly the same keys', () => {
    const enKeys = Object.keys(MESSAGES.en).sort();
    for (const l of locales) {
      expect(Object.keys(MESSAGES[l]).sort(), `locale ${l}`).toEqual(enKeys);
    }
  });

  it('placeholders match across locales for every key', () => {
    const slots = (s) => ([...s.matchAll(/\{(\d)\}/g)].map((m) => m[1]).sort());
    for (const key of Object.keys(MESSAGES.en)) {
      for (const l of locales) {
        expect(slots(MESSAGES[l][key]), `${l}:${key}`).toEqual(slots(MESSAGES.en[key]));
      }
    }
  });

  it('no locale has empty strings', () => {
    for (const l of locales) {
      for (const [k, v] of Object.entries(MESSAGES[l])) {
        expect(v.trim().length, `${l}:${k}`).toBeGreaterThan(0);
      }
    }
  });
});
