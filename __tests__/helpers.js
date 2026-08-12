// Test helpers: call the real API handlers with mock req/res against the
// file-based dev store (no Redis needed — TI's proven pattern).
const create = require('../api/create.js');
const join = require('../api/join.js');
const state = require('../api/state.js');
const answer = require('../api/answer.js');
const hint = require('../api/hint.js');
const host = require('../api/host.js');

function mockRes() {
  const r = { statusCode: null, body: null };
  r.status = (s) => { r.statusCode = s; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

async function call(handler, { method = 'POST', body = {}, query = {}, headers = {} } = {}) {
  const res = mockRes();
  await handler(
    { method, body, query, headers, socket: { remoteAddress: '127.0.0.1' } },
    res,
  );
  return res;
}

const get = (handler, query) => call(handler, { method: 'GET', query });

// Spin up a started fixture game: 2 teams, one player each.
async function startedGame() {
  const created = await call(create, {
    body: { adventureSlug: 'test-adventure', teams: ['Red', 'Blue'] },
  });
  const { code, hostToken, teams } = created.body;
  const p1 = (await call(join, { body: { code, name: 'Alice', teamId: teams[0].id } })).body;
  const p2 = (await call(join, { body: { code, name: 'Bob', teamId: teams[1].id } })).body;
  await call(host, { body: { code, hostToken, action: 'start' } });
  return { code, hostToken, teams, p1, p2 };
}

const playerState = (code, p) =>
  get(state, { code, playerId: p.playerId, token: p.token });
const hostState = (code, hostToken) => get(state, { code, hostToken });

module.exports = {
  create, join, state, answer, hint, host,
  call, get, mockRes, startedGame, playerState, hostState,
};
