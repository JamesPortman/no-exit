// Shared client helpers: API calls, session storage, time formatting.
'use strict';

// The path prefix this deployment is served under: empty at a domain root, "/no-exit"
// when portman.ca proxies the app as a subpath. Derived from the URL at runtime rather
// than baked in at build time, so one deployment serves both without a build flag.
const BASE = /^\/no-exit(\/|$)/.test(location.pathname) ? '/no-exit' : '';

// Turn a root-relative app path into one that survives the prefix.
const url = (path) => BASE + path;

async function api(path, body) {
  const opts = body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : {};
  const res = await fetch(url(path), opts);
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
