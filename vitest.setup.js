// Load ADVENTURE_KEY from .env.local before the suites run, so a local
// `npm test` opens the sealed content exactly like CI does. Without this the
// content suites would quietly skip on a developer machine while running in
// CI — the worst kind of coverage gap, because it hides.
//
// Deliberately this key ONLY. Pulling in the rest of .env.local would hand
// the tests a real ADMIN_TOKEN (changing which requests the engine accepts)
// and a real DATABASE_URL (pointing the history suite at production Neon).
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile) && process.env.ADVENTURE_KEY === undefined) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*ADVENTURE_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/);
    if (m) {
      process.env.ADVENTURE_KEY = m[1];
      break;
    }
  }
}
