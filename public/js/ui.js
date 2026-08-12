// Shared page chrome: language selector, day/night toggle, and per-
// adventure background art. Include after i18n.js on every page.
'use strict';

// --- Theme ---
function currentTheme() {
  return localStorage.getItem('escape:theme') || 'night';
}
function applyTheme() {
  document.documentElement.dataset.theme = currentTheme();
  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.textContent = currentTheme() === 'night' ? '☀️' : '🌙';
    btn.title = t('ui.theme');
  }
}
function toggleTheme() {
  localStorage.setItem('escape:theme', currentTheme() === 'night' ? 'day' : 'night');
  applyTheme();
}

// --- Background art ---
// Adventures set their own; anything without bespoke art (and plain pages)
// falls back to the keyhole motif.
const BG_SLUGS = new Set([
  'default', 'midnight-heist', 'lighthouse-vigil', 'last-carriage',
  'silent-observatory', 'curio-shop', 'alchemists-cellar', 'signal-deep',
  'clockmakers-attic', 'the-last-reel', 'cartographers-study',
]);
function setBackground(slug) {
  document.body.dataset.bg = BG_SLUGS.has(slug) ? slug : 'default';
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  applyI18n();
  applyTheme();
  if (!document.body.dataset.bg) setBackground('default');

  const langSel = document.getElementById('lang-select');
  if (langSel) {
    langSel.innerHTML = Object.entries(LANGS)
      .map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
    langSel.value = LANG;
    langSel.addEventListener('change', () => setLang(langSel.value));
  }
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
});
