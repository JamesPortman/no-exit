#!/usr/bin/env node
// Recover plaintext adventures from committed ciphertext:
//
//   npm run unseal
//
// Writes content/source/<slug>/index.js for any sealed adventure missing a
// working copy. This is the disaster-recovery path — with ADVENTURE_KEY and
// this repository you can always get the content back.
const fs = require('fs');
const path = require('path');
const { decrypt } = require('../api/_lib/seal.js');
const { loadKey } = require('./_key.js');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'content', 'source');
const SEALED_DIR = path.join(ROOT, 'content', 'sealed');

const key = loadKey();
if (!key) {
  console.error('ADVENTURE_KEY not found in the environment or .env.local.');
  process.exit(1);
}

const force = process.argv.includes('--force');
let written = 0;

for (const file of fs.readdirSync(SEALED_DIR).filter((f) => f.endsWith('.enc'))) {
  const slug = file.replace(/\.enc$/, '');
  const outDir = path.join(SOURCE_DIR, slug);
  const outFile = path.join(outDir, 'index.js');
  if (fs.existsSync(outFile) && !force) {
    console.log(`skipping ${slug}: working copy exists (use --force to overwrite)`);
    continue;
  }
  const adventure = JSON.parse(
    decrypt(fs.readFileSync(path.join(SEALED_DIR, file), 'utf8'), key),
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile,
    '// Recovered from sealed content. Edit here, then run `npm run seal`.\n' +
    `module.exports = ${JSON.stringify(adventure, null, 2)};\n`);
  written += 1;
  console.log(`recovered ${slug}`);
}

// Mirror of seal.js's riddle-bank pass.
const BANK_ENC = path.join(ROOT, 'content', 'solo', 'riddles.enc');
const BANK_OUT = path.join(ROOT, 'content', 'solo-source', 'riddles.js');
if (fs.existsSync(BANK_ENC) && (!fs.existsSync(BANK_OUT) || force)) {
  const bank = JSON.parse(decrypt(fs.readFileSync(BANK_ENC, 'utf8').trim(), key));
  fs.mkdirSync(path.dirname(BANK_OUT), { recursive: true });
  fs.writeFileSync(BANK_OUT,
    '// Recovered from sealed content. Edit here, then run `npm run seal`.\n' +
    `module.exports = ${JSON.stringify(bank, null, 2)};\n`);
  console.log(`recovered the solo riddle bank (${bank.riddles.length} riddles)`);
}

console.log(`\n${written} adventure(s) written to content/source/`);
