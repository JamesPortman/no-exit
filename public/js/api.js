// Shared client helpers: API calls, session storage, time formatting.
'use strict';

async function api(path, body) {
  const opts = body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : {};
  const res = await fetch(path, opts);
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

// One session per game code so a player can rejoin after a refresh.
const sessionKey = (code) => `escape:${code}`;
function saveSession(s) { localStorage.setItem(sessionKey(s.code), JSON.stringify(s)); }
function loadSession(code) {
  try { return JSON.parse(localStorage.getItem(sessionKey(code))); } catch { return null; }
}

function fmtMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Countdown that stays honest between polls: each state response anchors
// remainingMs to serverNow; the display extrapolates from that anchor.
function makeTimer(el) {
  let anchor = null; // { remainingMs, atLocal, running }
  setInterval(() => {
    if (!anchor) return;
    const left = anchor.running
      ? anchor.remainingMs - (Date.now() - anchor.atLocal)
      : anchor.remainingMs;
    el.textContent = fmtMs(left);
    el.classList.toggle('low', anchor.running && left < 2 * 60 * 1000 && left > 0);
  }, 250);
  return {
    update(state) {
      anchor = {
        remainingMs: state.remainingMs,
        atLocal: Date.now(),
        running: state.state === 'running',
      };
    },
  };
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}
