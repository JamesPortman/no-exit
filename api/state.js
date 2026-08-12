// Polled by host and players every ~2s. Performs the lazy timer-expiry
// transition and shapes responses so answers and hints never leak to players.
const { getStore } = require('./_lib/store.js');
const {
  loadGame, loadTeam, maybeExpire, elapsedMs, rankTeams, adventureFor,
  playersKey, logKey, sendJSON, TTL_SEC,
} = require('./_lib/games.js');
const { playerView } = require('./_lib/content.js');
const { recordResultsOnce } = require('./_lib/db.js');

module.exports = async (req, res) => {
  const code = String(req.query.code || '').toUpperCase();
  const { playerId, token, hostToken } = req.query;

  let meta = await loadGame(code);
  if (!meta) return sendJSON(res, 404, { error: 'game not found' });

  const store = getStore();
  const players = await store.hgetallJSON(playersKey(code));
  const isHost = hostToken && hostToken === meta.hostToken;
  const player = playerId && players[playerId];
  const isPlayer = player && player.token === token;
  if (!isHost && !isPlayer) return sendJSON(res, 403, { error: 'not in this game' });

  // Off-tab telemetry (TI-style): the player's poll reports cumulative time
  // spent away from the tab; clamp it and only ever let it grow.
  if (isPlayer && req.query.awayMs !== undefined) {
    const n = Math.min(3600000, Math.max(0, Math.round(Number(req.query.awayMs) || 0)));
    if (n > (player.awayMs || 0)) {
      player.awayMs = n;
      await store.hsetJSON(playersKey(code), playerId, player, TTL_SEC);
      players[playerId] = player;
    }
  }

  meta = await maybeExpire(meta);
  await recordResultsOnce(meta); // no-op unless just finished and unrecorded
  const adventure = adventureFor(meta);
  const now = Date.now();
  const elapsed = elapsedMs(meta, now);

  const teamStates = {};
  for (const t of meta.teams) teamStates[t.id] = await loadTeam(code, t.id);

  const roster = meta.teams.map((t) => ({
    id: t.id,
    name: t.name,
    players: Object.values(players)
      .filter((p) => p.teamId === t.id)
      .map((p) => p.name),
  }));

  const out = {
    state: meta.state,
    adventure: {
      slug: adventure.slug,
      title: adventure.title,
      intro: adventure.intro,
      i18n: adventure.i18n || null,
    },
    durationMs: meta.durationMs,
    elapsedMs: elapsed,
    remainingMs: Math.max(0, meta.durationMs - elapsed),
    serverNow: now,
    broadcast: meta.broadcast,
    teams: roster,
  };

  // Per-team off-tab totals decorate the ranking wherever it appears.
  const awayByTeam = {};
  for (const p of Object.values(players)) {
    awayByTeam[p.teamId] = (awayByTeam[p.teamId] || 0) + (p.awayMs || 0);
  }
  const rankWithAway = () => rankTeams(meta, teamStates, adventure)
    .map((r) => ({ ...r, awayMs: awayByTeam[r.teamId] || 0 }));

  if (meta.state === 'finished') {
    out.ranking = rankWithAway();
  }

  if (isHost) {
    const log = (await store.getJSON(logKey(code))) || [];
    out.host = {
      joinUrl: `/?join=${code}`,
      log: log.slice(-60),
      teams: meta.teams.map((t) => {
        const s = teamStates[t.id];
        const current = s.puzzleIdx < adventure.puzzles.length
          ? adventure.puzzles[s.puzzleIdx] : null;
        const lastSolveAt = s.solves.length ? s.solves[s.solves.length - 1].atMs : 0;
        return {
          id: t.id,
          name: t.name,
          players: Object.entries(players)
            .filter(([, p]) => p.teamId === t.id)
            .map(([pid, p]) => ({ id: pid, name: p.name, awayMs: p.awayMs || 0 })),
          puzzleIdx: s.puzzleIdx,
          totalPuzzles: adventure.puzzles.length,
          currentPuzzle: current ? { id: current.id, title: current.title } : null,
          msOnCurrentPuzzle: s.finishedAtMs != null ? 0 : Math.max(0, elapsed - lastSolveAt),
          wrongCount: s.wrongCount,
          lastWrongGuesses: log
            .filter((e) => e.type === 'wrong' && e.teamId === t.id)
            .slice(-3)
            .map((e) => e.guess),
          hintsTaken: s.hintsTaken,
          penaltyMs: s.penaltyMs,
          finishedAtMs: s.finishedAtMs,
        };
      }),
    };
    // The host also gets each team's player-safe view for spot-checking what
    // players see — still sanitized, so screen-sharing the console is safe.
    out.ranking = rankWithAway();

    // The full answer key is opt-in (?answers=1) so the DEFAULT host view
    // stays safe to screen-share; the console fetches it only when the host
    // deliberately expands the crib sheet.
    if (req.query.answers === '1') {
      out.host.answerKey = adventure.puzzles.map((p) => ({
        id: p.id,
        title: p.title,
        answers: p.answers || [],
        answerPattern: p.answerPattern || null,
        hints: (p.hints || []).map((h) => ({ text: h.text, penaltySec: h.penaltySec })),
        solveMessage: p.solveMessage,
      }));
    }
  }

  if (isPlayer) {
    const teamState = teamStates[player.teamId];
    const team = meta.teams.find((t) => t.id === player.teamId);
    out.you = { playerId, name: player.name, teamId: player.teamId, teamName: team?.name };
    out.team = {
      ...playerView(adventure, teamState),
      penaltyMs: teamState.penaltyMs,
      wrongCount: teamState.wrongCount,
      finishedAtMs: teamState.finishedAtMs,
    };
  }

  sendJSON(res, 200, out);
};
