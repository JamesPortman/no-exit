// Host console: richer polled view plus game controls. The hostToken comes
// from localStorage (set at creation) or a #token= fragment for opening the
// console on another device.
'use strict';

const $ = (id) => document.getElementById(id);
const code = new URLSearchParams(location.search).get('code')?.toUpperCase();
const fragToken = new URLSearchParams(location.hash.slice(1)).get('token');
if (fragToken) localStorage.setItem(`escape:host:${code}`, fragToken);
const hostToken = code && localStorage.getItem(`escape:host:${code}`);
if (!code || !hostToken) {
  document.body.innerHTML =
    '<div class="wrap"><div class="card">No host token for this game. ' +
    'Create a game from the <a href="/">landing page</a>, or open the exact ' +
    'console link you saved.</div></div>';
  throw new Error('no host session');
}

const timer = makeTimer($('timer'));
let lastState = null;

async function hostAction(action, extra = {}) {
  $('ctl-error').textContent = '';
  try {
    await api('/api/host', { code, hostToken, action, ...extra });
    await poll();
  } catch (e) {
    $('ctl-error').textContent = e.message;
  }
}

$('start-btn').onclick = () => hostAction('start');
$('pause-btn').onclick = () => hostAction('pause');
$('resume-btn').onclick = () => hostAction('resume');
$('end-btn').onclick = () => {
  if (confirm('End the game for everyone?')) hostAction('end');
};
$('broadcast-btn').onclick = () => {
  const message = $('broadcast-msg').value.trim();
  if (!message) return;
  $('broadcast-msg').value = '';
  hostAction('broadcast', { message });
};

function renderControls(state) {
  $('start-btn').classList.toggle('hidden', state !== 'lobby');
  $('pause-btn').classList.toggle('hidden', state !== 'running');
  $('resume-btn').classList.toggle('hidden', state !== 'paused');
  $('end-btn').classList.toggle('hidden', state === 'finished');
}

function renderTeams(s) {
  $('teams').innerHTML = s.host.teams.map((t) => {
    const done = t.finishedAtMs != null;
    const hintCount = Object.values(t.hintsTaken).reduce((a, b) => a + b, 0);
    const rosterHtml = t.players.length
      ? t.players.map((p) =>
          `<span style="white-space:nowrap">${esc(p.name)}${p.awayMs > 0 ? ` <span title="time off the game tab">👀 ${Math.round(p.awayMs / 1000)}s</span>` : ''}<button class="kick-btn" data-kick="${p.id}" data-name="${esc(p.name)}" title="remove player">✕</button></span>`
        ).join(', ')
      : 'no players yet';
    return `
    <div class="card host-team">
      <h3>${esc(t.name)} ${done ? '🎉' : ''}</h3>
      <div class="muted small">${rosterHtml}</div>
      <div class="stat"><span>Progress</span><strong>${t.puzzleIdx}/${t.totalPuzzles}${done ? ` — escaped in ${fmtMs(t.finishedAtMs)}` : ''}</strong></div>
      ${!done && t.currentPuzzle ? `
        <div class="stat"><span>Current puzzle</span><strong>${esc(t.currentPuzzle.title)}</strong></div>
        <div class="stat"><span>Time on it</span><span>${fmtMs(t.msOnCurrentPuzzle)}</span></div>` : ''}
      <div class="stat"><span>Wrong guesses</span><span>${t.wrongCount}${t.lastWrongGuesses.length ? ` <span class="muted">(${t.lastWrongGuesses.map(esc).join(' · ')})</span>` : ''}</span></div>
      <div class="stat"><span>Hints used</span><span>${hintCount}</span></div>
      <div class="stat"><span>Penalty</span><span>${t.penaltyMs ? '+' + fmtMs(t.penaltyMs) : '—'}</span></div>
      ${!done && s.state !== 'finished' ? `
        <button class="secondary small-btn" data-act="freehint" data-team="${t.id}">🎁 Free hint</button>
        <button class="secondary small-btn" data-act="advance" data-team="${t.id}">⏭ Force-advance</button>` : ''}
    </div>`;
  }).join('');
  for (const btn of $('teams').querySelectorAll('button[data-act]')) {
    btn.onclick = () => {
      const { act, team } = btn.dataset;
      if (act === 'advance' && !confirm('Skip this team past their current puzzle?')) return;
      hostAction(act, { teamId: team });
    };
  }
  for (const btn of $('teams').querySelectorAll('button[data-kick]')) {
    btn.onclick = () => {
      if (!confirm(`Remove ${btn.dataset.name} from the game? They can rejoin with the code.`)) return;
      hostAction('kick', { playerId: btn.dataset.kick });
    };
  }
}

// Answer key: fetched only when the host opens the crib sheet, so the
// default console stays safe to screen-share.
let answerKeyLoaded = false;
document.getElementById('answer-key-details')?.addEventListener('toggle', async (e) => {
  if (!e.target.open || answerKeyLoaded) return;
  try {
    const s = await api(`/api/state?code=${code}&hostToken=${encodeURIComponent(hostToken)}&answers=1`);
    answerKeyLoaded = true;
    $('answer-key').innerHTML = (s.host.answerKey || []).map((p, i) => `
      <div class="solved-item">
        <strong>${i + 1}. ${esc(p.title)}</strong>
        <div>Answer: <strong>${p.answers.map(esc).join('</strong> / <strong>')}</strong>
          ${p.answerPattern ? `<span class="muted small">(pattern: ${esc(p.answerPattern)})</span>` : ''}</div>
        ${p.hints.map((h, n) => `<div class="muted small">Hint ${n + 1} (+${h.penaltySec}s): ${esc(h.text)}</div>`).join('')}
      </div>`).join('');
  } catch (err) {
    $('answer-key').textContent = err.message;
  }
});

function renderLog(log) {
  const line = (e) => {
    const t = new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const team = lastState?.teams.find((x) => x.id === e.teamId)?.name || e.teamId || '';
    switch (e.type) {
      case 'join': return `<span class="t">${t}</span>${esc(e.name)} joined ${esc(team)}`;
      case 'solve': return `<span class="t">${t}</span>✔ ${esc(team)} solved “${esc(e.puzzleTitle)}”${e.finished ? ' — ESCAPED! 🎉' : ''}`;
      case 'wrong': return `<span class="t">${t}</span>✘ ${esc(team)}: “${esc(e.guess)}”`;
      case 'hint': return `<span class="t">${t}</span>💡 ${esc(team)} took hint ${e.hintIdx + 1} (+${e.penaltySec}s)`;
      case 'freehint': return `<span class="t">${t}</span>🎁 free hint to ${esc(team)}`;
      case 'advance': return `<span class="t">${t}</span>⏭ ${esc(team)} force-advanced past “${esc(e.puzzleTitle)}”`;
      case 'host': return `<span class="t">${t}</span>🎛 host: ${esc(e.action)}${e.msg ? ` — “${esc(e.msg)}”` : ''}`;
      default: return `<span class="t">${t}</span>${esc(e.type)}`;
    }
  };
  $('log').innerHTML = [...log].reverse()
    .map((e) => `<div class="log-entry ${e.type}">${line(e)}</div>`).join('');
}

function render(s) {
  lastState = s;
  timer.update(s);
  $('adventure-title').textContent = `${s.adventure.title} — ${s.state}`;
  $('code-display').textContent = code;
  const link = `${location.origin}/?join=${code}`;
  $('join-link').innerHTML = `<a href="${link}" style="color:var(--accent)">${link}</a>`;
  renderControls(s.state);
  renderTeams(s);
  // Standings only once the race is actually on.
  if (s.ranking && s.state !== 'lobby') {
    $('ranking-card').classList.remove('hidden');
    $('ranking').innerHTML = s.ranking.map((r, i) => `
      <div class="rank-row ${i === 0 ? 'first' : ''}">
        <div class="rank-pos">${i === 0 ? '🏆' : i + 1}</div>
        <div><strong>${esc(r.name)}</strong>
          <div class="rank-detail">${r.solved}/${r.totalPuzzles}${r.finished ? ` — ${fmtMs(r.adjustedMs)}` : ''}</div>
        </div>
      </div>`).join('');
  }
  renderLog(s.host.log);
}

async function poll() {
  try {
    const s = await api(`/api/state?code=${code}&hostToken=${encodeURIComponent(hostToken)}`);
    $('fatal').textContent = '';
    render(s);
  } catch (e) {
    $('fatal').textContent = `connection hiccup: ${e.message}`;
  }
}
poll();
setInterval(poll, 2000);
