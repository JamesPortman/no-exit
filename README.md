# Escape Room

A self-hosted virtual escape room for remote team events: 6–15 players on a
video call split into 2–3 competing teams (Zoom breakout rooms), racing
through the same ~50-minute puzzle adventure while the host watches progress,
nudges with hints, and calls the winner.

Architecture follows Terra Incognita: static pages + `api/` serverless
functions on Vercel, game state in Upstash Redis (file-store fallback
locally), results history in Neon Postgres. Clients poll `/api/state` every
~2s; there is no websocket.

## Layout

- `api/` — serverless endpoints: `config`, `create`, `join`, `state`,
  `answer`, `hint`, `host`
- `api/_lib/` — `store.js` (KV), `games.js` (engine), `content.js`
  (adventure loader + anti-spoiler sanitizer), `ratelimit.js`
- `content/adventures/` — plaintext fixtures only (`test-adventure`,
  `test-long`). They document the format and keep the engine testable in a
  clone with no key. See `content/adventures/_schema.md` to author one.
- `content/sealed/*.enc` — the ten real adventures, AES-256-GCM encrypted.
  This repository is public, so puzzle answers, hints and solve messages are
  committed only as ciphertext. Playing needs `ADVENTURE_KEY`; without it the
  app runs with the fixtures alone.
- `content/source/` — gitignored plaintext working copies. `npm run seal`
  encrypts them into `content/sealed/`; `npm run unseal` recovers them from
  ciphertext given the key.
- `public/index.html` / `play.html` / `host.html` — join page, player screen, host
  console (static, no build step)

## Develop

```bash
npm install
npm test          # Vitest: engine, timing, host controls, no-spoiler-leak
npm run dev       # local server on :3400 (file store, no Redis needed)
npm run seal      # re-encrypt content/source/ after authoring (needs the key)
npm run test:e2e  # Playwright (needs the dev server)
```

## Deploy

Push to `main` → GitHub Actions runs unit + E2E suites, then
`vercel deploy --prebuilt --prod`. Vercel's git auto-deploy is disabled in
`vercel.json`, so a red suite blocks the deploy.

Env vars (Vercel): `KV_REST_API_URL`/`KV_REST_API_TOKEN` (Upstash),
`DATABASE_URL` (Neon), `ADMIN_TOKEN` (gates game creation),
`ADVENTURE_KEY` (opens the sealed adventures).

GitHub Actions secrets: `VERCEL_TOKEN`, `ADVENTURE_KEY`. Repository
variables: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
