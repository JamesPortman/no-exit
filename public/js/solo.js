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

document.addEventListener('langchange', showBest);
showBest();

$('solo-start').addEventListener('click', async () => {
  $('solo-start').disabled = true;
  $('solo-error').textContent = '';
  try {
    const run = await api('/api/solo', { name: $('solo-name').value.trim() || undefined });
    // play.js boots from this session; without it the page bounces to /join.
    saveSession({ code: run.code, playerId: run.playerId, token: run.token,
                  name: $('solo-name').value.trim() });
    location.assign(`/play.html?code=${run.code}`);
  } catch (e) {
    $('solo-error').textContent = e.message;
    $('solo-start').disabled = false;
  }
});
