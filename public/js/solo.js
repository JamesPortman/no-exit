// Solo entry page: collect a name, start a run, hand off to the play screen.
//
// The clock starts server-side the moment /api/solo is called, which is why
// the name is collected here rather than after — nobody should burn their
// fifteen minutes reading a form.
'use strict';

const $ = (id) => document.getElementById(id);

// Personal best lives only in this browser. There is no solo leaderboard:
// runs are generated per player, so times are not comparable between people.
const BEST_KEY = 'escape:solo:best';
const readBest = () => {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)); } catch { return null; }
};

function showBest() {
  const best = readBest();
  if (!best?.ms) return;
  $('solo-best').hidden = false;
  $('solo-best').textContent = t('solo.best', fmtMs(best.ms), best.solved, best.total);
}

// The board is a nicety: if it cannot be reached, the page still plays.
async function showBoard() {
  try {
    const { scores } = await api('/api/leaderboard');
    const me = (localStorage.getItem('escape:solo:name') || '').trim().toLowerCase();
    $('solo-board').innerHTML = scores.length
      ? scores.map((r, i) => `
        <div class="rank-row ${String(r.player_name).trim().toLowerCase() === me && me ? 'first' : ''}">
          <div class="rank-pos">${i === 0 ? '🏆' : i + 1}</div>
          <div>
            <strong>${esc(r.player_name)}</strong> — ${fmtMs(Number(r.finish_ms))}
            <div class="rank-detail">
              ${t('play.puzzlesCount', r.puzzles_solved, r.total_puzzles)} · ${esc(r.room)}
            </div>
          </div>
        </div>`).join('')
      : `<p class="muted small">${t('solo.boardEmpty')}</p>`;
  } catch {
    $('solo-board').innerHTML = '';
  }
}

$('solo-name').value = localStorage.getItem('escape:solo:name') || '';

document.addEventListener('langchange', () => { showBest(); showBoard(); });
showBest();
showBoard();

$('solo-start').addEventListener('click', async () => {
  $('solo-start').disabled = true;
  $('solo-error').textContent = '';
  try {
    const chosen = $('solo-name').value.trim();
    // Remembered so the board can highlight this player's own row.
    if (chosen) localStorage.setItem('escape:solo:name', chosen);
    const run = await api('/api/solo', { name: chosen || undefined });
    // play.js boots from this session; without it the page bounces to /join.
    saveSession({ code: run.code, playerId: run.playerId, token: run.token, name: chosen });
    location.assign(`/play.html?code=${run.code}`);
  } catch (e) {
    $('solo-error').textContent = e.message;
    $('solo-start').disabled = false;
  }
});
