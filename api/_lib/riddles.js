// Riddle bank for generated Solo runs.
//
// Committed only as ciphertext (content/solo/riddles.enc) because the repo is
// public. Deliberately NOT under content/sealed/: everything there is loaded
// as an adventure, and a bank in that directory would break /api/config.
//
// Riddles are an enhancement, never a requirement — a clone with no key, and
// CI's E2E job (which gets no ADVENTURE_KEY), must still produce complete
// runs. Absent a key or a file, this returns [] and the generator substitutes
// a self-contained anagram instead.
const fs = require('fs');
const path = require('path');
const { keyFromEnv, decrypt } = require('./seal.js');

const BANK = path.join(__dirname, '..', '..', 'content', 'solo', 'riddles.enc');

let cache = null;

function loadRiddles() {
  if (cache) return cache;
  cache = [];
  try {
    const key = keyFromEnv();
    if (key && fs.existsSync(BANK)) {
      const parsed = JSON.parse(decrypt(fs.readFileSync(BANK, 'utf8').trim(), key));
      if (Array.isArray(parsed?.riddles)) cache = parsed.riddles;
    }
  } catch (e) {
    // A bad key or tampered file must never take Solo down — it just means
    // no riddles this run.
    console.error(`[riddles] could not open the bank: ${e.message}`);
  }
  return cache;
}

// Tests seal a bank mid-run and need the next read to see it.
function resetRiddleCache() { cache = null; }

module.exports = { loadRiddles, resetRiddleCache };
