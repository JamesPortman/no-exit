// Key lookup for the authoring scripts. Prefers a real environment variable,
// then falls back to .env.local — which `vercel env pull` writes — so the
// seal/unseal workflow needs no manual export on a machine that is already
// linked to the Vercel project.
//
// Serverless code never uses this: there ADVENTURE_KEY is a real env var.
const fs = require('fs');
const path = require('path');
const { keyFromEnv } = require('../api/_lib/seal.js');

function loadKey() {
  const direct = keyFromEnv();
  if (direct) return direct;

  const envFile = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envFile)) return null;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*ADVENTURE_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/);
    if (m) return keyFromEnv({ ADVENTURE_KEY: m[1] });
  }
  return null;
}

module.exports = { loadKey };
