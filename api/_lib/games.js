// Game-state helpers: codes, keys, timing, lazy transitions, ranking.
// Modeled on Terra Incognita's api/_lib/rooms.js.
const crypto = require('crypto');
const { getStore } = require('./store.js');
const { getAdventure } = require('./content.js');

const MAX_PLAYERS = 16;
const MAX_TEAMS = 3;
const TTL_SEC = 6 * 3600;
const LOG_CAP = 200;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const metaKey = (code) => `game:${code}`;
const playersKey = (code) => `game:${code}:players`;
const teamKey = (code, teamId) => `game:${code}:team:${teamId}`;
const logKey = (code) => `game:${code}:log`;

function newCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return c;
}

async function loadGame(code) {
  if (!/^[A-Z2-9]{4}$/.test(code || '')) return null;
  return getStore().getJSON(metaKey(code));
}

async function saveGame(meta) {
  await getStore().setJSON(metaKey(meta.code), meta, TTL_SEC);
}

function newTeamState() {
  return {
    puzzleIdx: 0,
    solves: [],          // [{ puzzleId, atMs, forced? }] atMs = elapsed game ms
    hintsTaken: {},      // puzzleId -> number of hints revealed
    penaltyMs: 0,
    wrongCount: 0,
    finishedAtMs: null,  // elapsed + penalty when last puzzle solved
  };
}

async function loadTeam(code, teamId) {
  return (await getStore().getJSON(teamKey(code, teamId))) || newTeamState();
}

async function saveTeam(code, teamId, team) {
  await getStore().setJSON(teamKey(code, teamId), team, TTL_SEC);
}

// Elapsed play time in ms, excluding pauses. 0 in lobby.
function elapsedMs(meta, now = Date.now()) {
  if (meta.state === 'lobby') return 0;
  const end =
    meta.state === 'paused' ? meta.pausedAt :
    meta.state === 'finished' ? meta.endedAt :
    now;
  return Math.max(0, end - meta.startAt - (meta.pauseAccumMs || 0));
}

// Lazy transition: running -> finished when the clock runs out. Called from
// every state read; benign if two polls race (same outcome).
async function maybeExpire(meta, now = Date.now()) {
  if (meta.state !== 'running') return meta;
  if (elapsedMs(meta, now) >= meta.durationMs) {
    meta.state = 'finished';
    meta.endedAt = meta.startAt + (meta.pauseAccumMs || 0) + meta.durationMs;
    await saveGame(meta);
  }
  return meta;
}

// Append to the capped event log. Read-modify-write: a poll race can drop an
// entry, which is acceptable for a host-side activity feed.
async function appendLog(code, event) {
  const store = getStore();
  const log = (await store.getJSON(logKey(code))) || [];
  log.push({ at: Date.now(), ...event });
  await store.setJSON(logKey(code), log.slice(-LOG_CAP), TTL_SEC);
}

// Lowercase, trim, collapse whitespace, strip punctuation. Applied to both the
// player's guess and the authored answers so authors needn't pre-normalize.
function normalizeAnswer(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkAnswer(puzzle, guess) {
  const norm = normalizeAnswer(guess);
  if (!norm) return false;
  if ((puzzle.answers || []).some((a) => normalizeAnswer(a) === norm)) return true;
  if (puzzle.answerPattern) {
    try {
      return new RegExp(puzzle.answerPattern, 'i').test(norm);
    } catch {
      return false;
    }
  }
  return false;
}

// Rank teams: most puzzles solved first; finished teams by adjusted finish
// time; unfinished teams by (last solve time + penalty) so earlier progress
// wins ties.
function rankTeams(meta, teamStates, adventure) {
  const rows = meta.teams.map((t) => {
    const s = teamStates[t.id] || newTeamState();
    const lastSolveAt = s.solves.length ? s.solves[s.solves.length - 1].atMs : 0;
    return {
      teamId: t.id,
      name: t.name,
      solved: s.solves.length,
      totalPuzzles: adventure.puzzles.length,
      penaltyMs: s.penaltyMs,
      finishedAtMs: s.finishedAtMs,
      adjustedMs: s.finishedAtMs != null ? s.finishedAtMs : lastSolveAt + s.penaltyMs,
      finished: s.finishedAtMs != null,
    };
  });
  rows.sort((a, b) => b.solved - a.solved || a.adjustedMs - b.adjustedMs);
  return rows;
}

// The adventure as THIS game plays it: when the host shortened the game at
// creation, only the first `puzzleCount` puzzles exist. Every consumer
// (answering, hints, views, ranking, results) goes through here, so the
// override applies everywhere at once. Returns a copy — never mutates the
// cached content module.
function adventureFor(meta) {
  // A Solo run's adventure was generated at creation and stored on the game
  // record, so there is no slug to resolve. Return it before the puzzleCount
  // slice below — solo sets puzzleCount to its own length, and a shortened
  // solo run would drop the finale the whole run builds toward.
  if (meta.mode === 'solo' && meta.soloAdventure) return meta.soloAdventure;
  const adv = getAdventure(meta.adventureSlug);
  if (!adv) throw new Error(`adventure ${meta.adventureSlug} missing`);
  const n = meta.puzzleCount;
  if (n && n > 0 && n < adv.puzzles.length) {
    return { ...adv, puzzles: adv.puzzles.slice(0, n) };
  }
  return adv;
}

function sendJSON(res, status, body) {
  res.status(status).json(body);
}

// Shared request validation: loads game + verifies the caller is a player in
// it. Returns { meta, players, player } or sends the error response itself.
async function requirePlayer(req, res) {
  const body = req.body || {};
  const code = String(body.code || req.query?.code || '').toUpperCase();
  const playerId = body.playerId || req.query?.playerId;
  const token = body.token || req.query?.token;
  const meta = await loadGame(code);
  if (!meta) {
    sendJSON(res, 404, { error: 'game not found' });
    return null;
  }
  const players = await getStore().hgetallJSON(playersKey(code));
  const player = playerId && players[playerId];
  if (!player || player.token !== token) {
    sendJSON(res, 403, { error: 'not in this game' });
    return null;
  }
  return { meta, players, player, playerId };
}

module.exports = {
  MAX_PLAYERS, MAX_TEAMS, TTL_SEC,
  metaKey, playersKey, teamKey, logKey,
  newCode, loadGame, saveGame, newTeamState, loadTeam, saveTeam,
  elapsedMs, maybeExpire, appendLog,
  normalizeAnswer, checkAnswer, rankTeams, adventureFor,
  sendJSON, requirePlayer,
};
