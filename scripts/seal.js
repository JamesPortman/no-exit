#!/usr/bin/env node
// Seal the plaintext adventures in content/source/ into committed ciphertext
// in content/sealed/. Run after authoring or editing an adventure:
//
//   npm run seal
//
// content/source/ is gitignored — it is the author's working copy and must be
// backed up outside this repo. `npm run unseal` reverses this using the same
// ADVENTURE_KEY, so key + repo is enough to recover the content.
const fs = require('fs');
const path = require('path');
const { encrypt } = require('../api/_lib/seal.js');
const { loadKey } = require('./_key.js');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'content', 'source');
const SEALED_DIR = path.join(ROOT, 'content', 'sealed');

const key = loadKey();
if (!key) {
  console.error('ADVENTURE_KEY not found in the environment or .env.local.');
  process.exit(1);
}

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`no plaintext at ${SOURCE_DIR} — nothing to seal.`);
  process.exit(1);
}
fs.mkdirSync(SEALED_DIR, { recursive: true });

const slugs = fs.readdirSync(SOURCE_DIR)
  .filter((d) => fs.statSync(path.join(SOURCE_DIR, d)).isDirectory());

let sealed = 0;
for (const slug of slugs) {
  const modulePath = path.join(SOURCE_DIR, slug, 'index.js');
  if (!fs.existsSync(modulePath)) {
    console.error(`skipping ${slug}: no index.js`);
    continue;
  }
  delete require.cache[require.resolve(modulePath)];
  const adventure = require(modulePath);
  if (adventure.slug !== slug) {
    console.error(`slug mismatch: directory ${slug} declares "${adventure.slug}"`);
    process.exit(1);
  }
  // Adventures are pure data, so they round-trip through JSON — no code is
  // ever encrypted, stored, or evaluated.
  const json = JSON.stringify(adventure);
  fs.writeFileSync(path.join(SEALED_DIR, `${slug}.enc`), encrypt(json, key) + '\n');
  sealed += 1;
  console.log(`sealed ${slug} (${adventure.puzzles.length} puzzles)`);
}

// Remove sealed files whose source is gone, so deletions propagate.
for (const f of fs.readdirSync(SEALED_DIR).filter((f) => f.endsWith('.enc'))) {
  const slug = f.replace(/\.enc$/, '');
  if (!slugs.includes(slug)) {
    fs.unlinkSync(path.join(SEALED_DIR, f));
    console.log(`removed stale ${f}`);
  }
}

console.log(`\n${sealed} adventure(s) sealed into content/sealed/`);
