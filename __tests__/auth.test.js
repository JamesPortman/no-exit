// Secrets and lookups: admin gating fails closed on a deployment, token
// compares refuse empties, roster lookups ignore inherited keys, and join
// links stay inside the /no-exit prefix.
import { describe, it, expect, afterEach } from 'vitest';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const historyHandler = require('../api/history.js');
const leaderboard = require('../api/leaderboard.js');
const { safeEqual, isAdmin, ownEntry } = require('../api/_lib/auth.js');
const {
  create, host, answer, hint, call, get, state, startedGame, hostState,
} = require('./helpers.js');

const saved = { ADMIN_TOKEN: process.env.ADMIN_TOKEN, VERCEL_ENV: process.env.VERCEL_ENV };
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});
const setEnv = (vars) => {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
};

const newGame = (body = {}) => call(create, {
  body: { adventureSlug: 'test-adventure', teams: ['Red', 'Blue'], ...body },
});

describe('safeEqual', () => {
  it('matches equal non-empty strings only', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(false);
    expect(safeEqual(undefined, undefined)).toBe(false);
    expect(safeEqual(null, null)).toBe(false);
    expect(safeEqual(['abc'], 'abc')).toBe(false);
  });
});

describe('ownEntry', () => {
  it('ignores keys inherited from Object.prototype', () => {
    const players = { p1: { token: 't' } };
    expect(ownEntry(players, 'p1')).toEqual({ token: 't' });
    for (const k of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(ownEntry(players, k)).toBe(null);
    }
  });
});

describe('admin gating', () => {
  it('without ADMIN_TOKEN, allows creation only off Vercel', async () => {
    setEnv({ ADMIN_TOKEN: undefined, VERCEL_ENV: undefined });
    expect(isAdmin(undefined, { allowUnset: true })).toBe(true);
    expect((await newGame()).statusCode).toBe(200);

    for (const env of ['production', 'preview', 'development']) {
      setEnv({ VERCEL_ENV: env });
      expect((await newGame()).statusCode).toBe(403);
      expect((await newGame({ adminToken: 'anything' })).statusCode).toBe(403);
    }
  });

  it('with ADMIN_TOKEN, creation requires the exact key', async () => {
    setEnv({ ADMIN_TOKEN: 'secret-key', VERCEL_ENV: 'production' });
    expect((await newGame()).statusCode).toBe(403);
    expect((await newGame({ adminToken: '' })).statusCode).toBe(403);
    expect((await newGame({ adminToken: 'secret-ke' })).statusCode).toBe(403);
    expect((await newGame({ adminToken: ['secret-key'] })).statusCode).toBe(403);
  });

  it('history refuses everyone when ADMIN_TOKEN is unset, even off Vercel', async () => {
    setEnv({ ADMIN_TOKEN: undefined, VERCEL_ENV: undefined });
    expect((await call(historyHandler, { body: {} })).statusCode).toBe(403);
    expect((await call(historyHandler, { body: { adminToken: '' } })).statusCode).toBe(403);
    expect((await call(historyHandler, { body: { adminToken: 'x' } })).statusCode).toBe(403);
  });

  it('leaderboard deletion refuses everyone when ADMIN_TOKEN is unset', async () => {
    setEnv({ ADMIN_TOKEN: undefined, VERCEL_ENV: undefined });
    expect((await call(leaderboard, { body: { id: 1 } })).statusCode).toBe(403);
  });
});

describe('roster lookups cannot be bypassed', () => {
  it('rejects prototype-key player ids with a missing token', async () => {
    const { code } = await startedGame();
    for (const playerId of ['constructor', '__proto__', 'toString']) {
      expect((await get(state, { code, playerId })).statusCode).toBe(403);
      expect((await call(answer, { body: { code, playerId, puzzleId: 'p1', answer: 'x' } })).statusCode).toBe(403);
      expect((await call(hint, { body: { code, playerId, puzzleId: 'p1' } })).statusCode).toBe(403);
    }
  });

  it('rejects an empty or missing host token, and prototype-key kicks', async () => {
    const { code, hostToken } = await startedGame();
    expect((await get(state, { code, hostToken: '' })).statusCode).toBe(403);
    expect((await call(host, { body: { code, action: 'pause' } })).statusCode).toBe(403);
    for (const playerId of ['constructor', '__proto__']) {
      expect((await call(host, {
        body: { code, hostToken, action: 'kick', playerId },
      })).statusCode).toBe(400);
    }
  });
});

describe('join links respect the path prefix', () => {
  it('the API hands back a link relative to the app, not the site root', async () => {
    setEnv({ ADMIN_TOKEN: undefined, VERCEL_ENV: undefined });
    const made = await newGame();
    expect(made.body.joinUrl).toBe(`./?join=${made.body.code}`);
    const h = await hostState(made.body.code, made.body.hostToken);
    expect(h.body.host.joinUrl).toBe(`./?join=${made.body.code}`);
    // Resolved against a page under the prefix, it stays under the prefix.
    expect(new URL(made.body.joinUrl, 'https://portman.ca/no-exit/host.html?code=X').pathname)
      .toBe('/no-exit/');
  });

  it('url() prefixes the join path under /no-exit and not at the root', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/js/api.js'), 'utf8');
    const urlAt = (pathname) => {
      const ctx = { location: { pathname } };
      vm.runInNewContext(`${src}\nthis.out = url('/?join=ABC123');`, ctx);
      return ctx.out;
    };
    expect(urlAt('/no-exit/host.html')).toBe('/no-exit/?join=ABC123');
    expect(urlAt('/host.html')).toBe('/?join=ABC123');
  });

  it('client scripts route join links and bounces through url()', () => {
    const read = (f) => fs.readFileSync(path.join(__dirname, '../public/js', f), 'utf8');
    const hostSrc = read('host.js');
    expect(hostSrc).not.toContain('${location.origin}/');
    expect(hostSrc).toContain('url(`/?join=');
    // play.js sends a player without a session back to the join page.
    expect(read('play.js')).not.toMatch(/location\.(replace|assign)\(\s*['"`]\//);
  });
});
