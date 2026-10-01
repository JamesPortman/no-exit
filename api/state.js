// Polled by host and players every ~2s. Performs the lazy timer-expiry
// transition and shapes responses so answers and hints never leak to players.
const { getStore } = require('./_lib/store.js');
const {
  loadGame, loadTeam, maybeExpire, elapsedMs, rankTeams, adventureFor,
  playersKey, logKey, chatKey, tabChargeKey, appendLog, saveTeam, sendJSON, TTL_SEC,
  TAB_PENALTY_MS, TAB_GRACE_MS,
} = require('./_lib/games.js');
const { playerView, localizeAdventure, langOf } = require('./_lib/content.js');
const { recordResultsOnce } = require('./_lib/db.js');
const { safeEqual, playerFor } = require('./_lib/auth.js');

const HOST_CHAT_TAIL = 50;
const PLAYER_CHAT_TAIL = 100;

// A chat message as clients see it: the sender's player id stays server-side.
const publicMsg = (m) => ({ seq: m.seq, at: m.at, name: m.name, text: m.text });

module.exports = async (req, res) => {
  const code = String(req.query.code || '').toUpperCase();
  const { playerId, token, hostToken } = req.query;

  let meta = await loadGame(code);
  if (!meta) return sendJSON(res, 404, { error: 'game not found' });

  const store = getStore();
  const players = await store.hgetallJSON(playersKey(code));
  const isHost = safeEqual(hostToken, meta.hostToken);
  const player = playerFor(players, playerId, token);
  const isPlayer = !!player;
  if (!isHost && !isPlayer) return sendJSON(res, 403, { error: 'not in this game' });

  meta = await maybeExpire(meta);
  const now = Date.now();

  // Off-tab telemetry (TI-style): the player's poll reports cumulative time
  // spent away from the tab; clamp it and only ever let it grow. It also
  // reports whether the tab is hidden RIGHT NOW (`away=1|0`) — the client
  // polls the instant visibility flips — so the host sees who is gone while
  // they are gone, not only once they come back.
  if (isPlayer) {
    let dirty = false;
    if (req.query.awayMs !== undefined) {
      const n = Math.min(3600000, Math.max(0, Math.round(Number(req.query.awayMs) || 0)));
      if (n > (player.awayMs || 0)) {
        player.awayMs = n;
        dirty = true;
      }
    }
    if (req.query.away === '1' || req.query.away === '0') {
      const away = req.query.away === '1';
      if (away && !player.awaySince) {
        player.awaySince = now;
        dirty = true;
      } else if (!away && player.awaySince) {
        const goneMs = now - player.awaySince;
        player.awaySince = null;
        dirty = true;
        // A refresh flips hidden→visible in a blink; only log real absences.
        if (meta.state === 'running' && goneMs >= 3000) {
          await appendLog(code, { type: 'back', teamId: player.teamId, name: player.name, goneMs });
        }
      }
    }
    if (dirty) {
      await store.hsetJSON(playersKey(code), playerId, player, TTL_SEC);
      players[playerId] = player;
    }
  }

  await recordResultsOnce(meta); // no-op unless just finished and unrecorded
  // Puzzle text is localized at read time; answers are language-independent
  // (see content.js), so nothing about scoring depends on this.
  const adventure = localizeAdventure(adventureFor(meta), langOf(req));
  const elapsed = elapsedMs(meta, now);

  const teamStates = {};
  for (const t of meta.teams) teamStates[t.id] = await loadTeam(code, t.id);

  // Tab penalty: anyone off the tab past the grace period costs their team a
  // minute, once per absence. Charged by whichever poll sees it first — the
  // host's or a teammate's — so a player whose hidden tab has stopped polling
  // is still charged. Solo runs are exempt: nobody else is affected.
  if (meta.state === 'running' && meta.mode !== 'solo') {
    const due = Object.entries(players).filter(([, p]) =>
      p.awaySince && now - p.awaySince >= TAB_GRACE_MS);
    if (due.length) {
      const charged = await store.hgetallJSON(tabChargeKey(code));
      for (const [pid, p] of due) {
        const team = teamStates[p.teamId];
        const field = `${pid}:${p.awaySince}`;
        if (!team || team.finishedAtMs != null || Object.hasOwn(charged, field)) continue;
        if (!(await store.hsetnxJSON(tabChargeKey(code), field, 1, TTL_SEC))) continue;
        team.penaltyMs += TAB_PENALTY_MS;
        team.tabPenalties = [...(team.tabPenalties || []), { name: p.name, atMs: elapsed }];
        await saveTeam(code, p.teamId, team);
        await appendLog(code, {
          type: 'tabpenalty', teamId: p.teamId, name: p.name, penaltySec: TAB_PENALTY_MS / 1000,
        });
      }
    }
  }

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
    solo: meta.mode === 'solo',
    tabPenaltySec: meta.mode === 'solo' ? 0 : TAB_PENALTY_MS / 1000,
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
    const chats = {};
    for (const t of meta.teams) {
      chats[t.id] = (await store.listJSON(chatKey(code, t.id))).slice(-HOST_CHAT_TAIL);
    }
    out.host = {
      joinUrl: `./?join=${code}`, // relative: resolve against the app's root page
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
            .map(([pid, p]) => ({
              id: pid,
              name: p.name,
              awayMs: p.awayMs || 0,
              // Live: how long they have been off the tab right now, or null.
              awayForMs: p.awaySince && meta.state !== 'finished'
                ? Math.max(0, now - p.awaySince) : null,
            })),
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
          tabPenaltyCount: (s.tabPenalties || []).length,
          finishedAtMs: s.finishedAtMs,
          chat: chats[t.id].map(publicMsg),
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
      tabPenalties: teamState.tabPenalties || [],
      finishedAtMs: teamState.finishedAtMs,
    };
    // Team chat, incrementally: the client sends the last seq it holds and
    // gets only what is newer. Solo runs have no team to talk to.
    if (meta.mode !== 'solo') {
      const after = Math.max(0, Number(req.query.chatAfter) || 0);
      out.chat = (await store.listJSON(chatKey(code, player.teamId)))
        .filter((m) => m.seq > after)
        .slice(-PLAYER_CHAT_TAIL)
        .map((m) => ({ ...publicMsg(m), mine: m.pid === playerId }));
    }
  }

  sendJSON(res, 200, out);
};
