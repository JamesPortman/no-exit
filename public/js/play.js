// Player screen: polls /api/state every 2s and renders lobby / play /
// paused / finished views. Server is authoritative for everything.
'use strict';

const $ = (id) => document.getElementById(id);
const code = new URLSearchParams(location.search).get('code')?.toUpperCase();
const session = code && loadSession(code);
if (!session?.playerId) location.replace(code ? `/?join=${code}` : '/');

const timer = makeTimer($('timer'));
let lastPuzzleId = null;
let submitting = false;

// Off-tab tracking (as in Terra Incognita): accumulate time this player
// spends away from the tab while the game is running; the poll reports it
// and the host console / final ranking show it when it's more than zero.
let awayMs = 0, hiddenAt = null, sentAwayMs = 0, lastGameState = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
  } else if (hiddenAt != null) {
    if (lastGameState === 'running') awayMs += Date.now() - hiddenAt;
    hiddenAt = null;
  }
});

// Effect triggers: everything compares against the previous poll so chimes
// and confetti fire exactly once per event; the first render is silent so a
// page refresh never replays celebrations.
let firstRender = true;
let lastSolvedCount = 0;
let lastBroadcastAt = 0;
let teamCelebrated = false;
let gameOverCelebrated = false;
const warned = {};
let warningTimeout = null;

function timeWarnings(s) {
  if (s.state !== 'running') {
    $('time-warning').classList.add('hidden');
    return;
  }
  const level = s.remainingMs <= 60_000 ? 'one' : s.remainingMs <= 300_000 ? 'five' : null;
  if (!level || warned[level]) return;
  warned[level] = true;
  $('time-warning').textContent = level === 'one' ? t('play.oneMin') : t('play.fiveMin');
  $('time-warning').classList.remove('hidden');
  if (!firstRender) chime('warn');
  clearTimeout(warningTimeout);
  warningTimeout = setTimeout(() => $('time-warning').classList.add('hidden'), 15_000);
}

function show(view) {
  for (const v of ['lobby', 'paused', 'play', 'finished']) {
    $(`view-${v}`).classList.toggle('hidden', v !== view);
  }
}

function renderRanking(ranking) {
  $('ranking').innerHTML = ranking.map((r, i) => `
    <div class="rank-row ${i === 0 ? 'first' : ''}">
      <div class="rank-pos">${i === 0 ? '🏆' : i + 1}</div>
      <div>
        <strong>${esc(r.name)}</strong>
        <div class="rank-detail">
          ${t('play.puzzlesCount', r.solved, r.totalPuzzles)}
          ${r.finished ? ` — ${t('play.escapedIn', fmtMs(r.adjustedMs))}` : ''}
          ${r.penaltyMs ? ` ${t('play.inclPenalties', fmtMs(r.penaltyMs))}` : ''}
          ${r.awayMs > 0 ? ` · ${t('play.offTab', Math.round(r.awayMs / 1000))}` : ''}
        </div>
      </div>
    </div>`).join('');
}

// A solo run's time is kept only in this browser. There is no solo
// leaderboard by design: every run is generated for that player, so times
// are not comparable between people — only against your own last attempt.
const SOLO_BEST_KEY = 'escape:solo:best';
const soloBest = () => {
  try { return JSON.parse(localStorage.getItem(SOLO_BEST_KEY)); } catch { return null; }
};

// Rendered once, not on every poll: the best is saved on the first pass, so
// recomputing two seconds later would decide the run is no longer a record
// and replace the congratulation with a flat restatement of the same time.
let soloResultShown = false;

function renderSoloResult(s) {
  if (soloResultShown) return;
  soloResultShown = true;
  const r = (s.ranking && s.ranking[0]) || {};
  const escaped = Boolean(r.finished);
  const prev = soloBest();
  const isNewBest = escaped && (!prev || !prev.ms || r.adjustedMs < prev.ms);
  if (isNewBest) {
    localStorage.setItem(SOLO_BEST_KEY, JSON.stringify({
      ms: r.adjustedMs, solved: r.solved, total: r.totalPuzzles,
    }));
  }
  const best = soloBest();
  $('ranking').innerHTML = `
    <div class="rank-row first">
      <div class="rank-pos">${escaped ? '🏆' : '⏱'}</div>
      <div>
        <strong>${escaped
          ? t('solo.escaped', fmtMs(r.adjustedMs))
          : t('solo.ranOut', r.solved || 0, r.totalPuzzles || 0)}</strong>
        <div class="rank-detail">
          ${t('play.puzzlesCount', r.solved || 0, r.totalPuzzles || 0)}
          ${r.penaltyMs ? ` ${t('play.inclPenalties', fmtMs(r.penaltyMs))}` : ''}
        </div>
      </div>
    </div>
    ${isNewBest ? `<p class="accent" style="text-align:center">${t('solo.newBest')}</p>` : ''}
    ${!isNewBest && best && best.ms
      ? `<p class="muted small" style="text-align:center">${t('solo.toBeat', fmtMs(best.ms))}</p>` : ''}
    <p style="text-align:center;margin-top:14px">
      <a href="/solo.html" style="color:var(--accent)">${t('solo.again')}</a></p>`;
}

function render(s) {
  timer.update(s);
  setBackground(s.adventure.slug);
  $('adventure-title').textContent = advText(s.adventure, 'title');
  $('team-name').textContent = s.solo ? s.you.name : s.you.teamName;

  // Nobody is hosting a solo run, so the broadcast banner is dead chrome.
  const b = s.solo ? null : s.broadcast;
  $('broadcast').classList.toggle('hidden', !b || Date.now() - b.at > 60_000);
  if (b) {
    $('broadcast').textContent = `📢 ${b.msg}`;
    if (!firstRender && b.at > lastBroadcastAt) chime('notify');
    lastBroadcastAt = b.at;
  }
  timeWarnings(s);

  if (s.state === 'lobby') {
    show('lobby');
    $('lobby-title').textContent = advText(s.adventure, 'title');
    $('lobby-intro').textContent = advText(s.adventure, 'intro');
    $('lobby-roster').innerHTML = s.teams.map((t) => `
      <div class="team-chip">
        <strong>${esc(t.name)}</strong>
        <div class="members">${t.players.map(esc).join(', ') || '—'}</div>
      </div>`).join('');
    return;
  }
  if (s.state === 'paused') return show('paused');
  if (s.state === 'finished') {
    show('finished');
    if (s.solo) renderSoloResult(s); else renderRanking(s.ranking);
    if (!firstRender && !gameOverCelebrated) {
      gameOverCelebrated = true;
      if (s.ranking[0]?.teamId === s.you.teamId) {
        chime('finish');
        confetti();
      } else {
        chime('notify');
      }
    }
    return;
  }

  // Running.
  show('play');
  const team = s.team;
  if (!firstRender && team.solved.length > lastSolvedCount) chime('solve');
  lastSolvedCount = team.solved.length;
  if (team.finishedAtMs != null && !teamCelebrated) {
    teamCelebrated = true;
    if (!firstRender) {
      chime('finish');
      confetti();
    }
  }
  $('penalty').classList.toggle('hidden', !team.penaltyMs);
  $('penalty').textContent = t('play.penalty', fmtMs(team.penaltyMs));

  $('dots').innerHTML = Array.from({ length: team.totalPuzzles }, (_, i) =>
    `<div class="dot ${i < team.puzzleIdx ? 'done' : i === team.puzzleIdx ? 'current' : ''}"></div>`
  ).join('');

  $('solved-log').innerHTML = team.solved.length
    ? `<h3 class="muted small">${t('play.unlocked')}</h3>` +
      team.solved.map((x) => `
      <div class="solved-item">
        <strong>${esc(x.title)}</strong> ${x.forced ? `<span class="muted small">${t('play.hostAssist')}</span>` : ''}
        <div class="msg">${esc(x.solveMessage)}</div>
      </div>`).join('') : '';

  if (team.finishedAtMs != null || !team.puzzle) {
    $('puzzle-card').classList.add('hidden');
    $('team-finished').classList.remove('hidden');
    return;
  }
  $('puzzle-card').classList.remove('hidden');
  $('team-finished').classList.add('hidden');

  const p = team.puzzle;
  if (p.id !== lastPuzzleId) {
    // New puzzle: reset the input only on transition so we never clobber a
    // guess mid-typing on a poll.
    lastPuzzleId = p.id;
    $('guess').value = '';
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
  }
  $('puzzle-title').textContent = `${team.puzzleIdx + 1}. ${p.title}`;
  $('puzzle-prompt').innerHTML = p.prompt; // authored trusted HTML
  $('puzzle-media').innerHTML = (p.media || [])
    .map((m) => `<img src="${m}" alt="puzzle image" loading="lazy">`).join('');

  $('hints').innerHTML = team.revealedHints
    .map((h, i) => `<div class="hint-box">${t('play.hintN', i + 1, esc(h))}</div>`).join('');
  const nextIdx = team.revealedHints.length;
  $('hint-controls').innerHTML = nextIdx < p.hintCount
    ? `<button class="secondary small-btn" id="hint-btn">
         ${t('play.revealHint', nextIdx + 1, p.hintPenaltiesSec[nextIdx])}
       </button>`
    : '';
  const hb = $('hint-btn');
  if (hb) hb.onclick = async () => {
    if (!confirm(t('play.confirmHint', nextIdx + 1, p.hintPenaltiesSec[nextIdx]))) return;
    hb.disabled = true;
    try { await api('/api/hint', { code, playerId: session.playerId, token: session.token, puzzleId: p.id, lang: LANG }); await poll(); }
    catch (e) { $('feedback').textContent = e.message; }
  };
}

async function submitGuess() {
  const guess = $('guess').value.trim();
  if (!guess || submitting || !lastPuzzleId) return;
  submitting = true;
  $('submit').disabled = true;
  try {
    const r = await api('/api/answer', {
      code, playerId: session.playerId, token: session.token,
      puzzleId: lastPuzzleId, guess, lang: LANG,
    });
    if (r.correct) {
      $('feedback').textContent = r.finished ? t('play.lastOne') : t('play.correct');
      $('feedback').className = 'feedback good';
    } else if (!r.stale) {
      $('feedback').textContent = t('play.wrong');
      $('feedback').className = 'feedback bad';
    }
    await poll();
  } catch (e) {
    $('feedback').textContent = e.message;
    $('feedback').className = 'feedback bad';
  } finally {
    submitting = false;
    $('submit').disabled = false;
  }
}
$('submit').addEventListener('click', submitGuess);
$('guess').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitGuess(); });

async function poll() {
  try {
    // LANG is a global from i18n.js. The server renders puzzle text in it;
    // scoring is unaffected, so switching mid-run is safe.
    let url = `/api/state?code=${code}&playerId=${session.playerId}`
      + `&token=${encodeURIComponent(session.token)}&lang=${LANG}`;
    const reporting = Math.round(awayMs);
    if (reporting > sentAwayMs) url += `&awayMs=${reporting}`;
    const s = await api(url);
    if (reporting > sentAwayMs) sentAwayMs = reporting;
    lastGameState = s.state;
    $('fatal').textContent = '';
    render(s);
    firstRender = false;
  } catch (e) {
    // Transient network errors just skip a beat; auth errors bounce to join.
    if (/not in this game|game not found/.test(e.message)) {
      localStorage.removeItem(`escape:${code}`);
      location.replace('/');
    } else {
      $('fatal').textContent = t('play.hiccup', e.message);
    }
  }
}
// Switching language re-fetches so the current puzzle, its revealed hints and
// every solve message already on screen redraw in the new language. The typed
// guess survives: render() only clears the input when the puzzle id changes.
document.addEventListener('langchange', () => { poll(); });

poll();
setInterval(poll, 2000);
