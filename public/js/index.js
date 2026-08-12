// Landing page: join an existing game, or (host) create one.
'use strict';

const $ = (id) => document.getElementById(id);
let lookedUp = null;

// Prefill from ?join=CODE and auto-look-up.
const params = new URLSearchParams(location.search);
if (params.get('join')) {
  $('join-code').value = params.get('join').toUpperCase();
  lookup();
}

document.addEventListener('langchange', () => {
  if (lookedUp) $('join-title').textContent = t('join.pickTeam', advText(lookedUp, 'title'));
});

// Localized default team names: fill on load and follow language switches,
// but never overwrite a name the host has typed themselves.
const teamDefaults = () => {
  const all = [];
  for (const lang of Object.keys(LANGS)) {
    for (const k of ['team.default1', 'team.default2', 'team.default3']) {
      all.push(MESSAGES[lang][k]);
    }
  }
  return all;
};
function applyTeamDefaults() {
  const defaults = teamDefaults();
  [1, 2, 3].forEach((i) => {
    const input = $(`team-${i}`);
    if (!input.value.trim() || defaults.includes(input.value.trim())) {
      input.value = t(`team.default${i}`);
    }
  });
}
applyTeamDefaults();
document.addEventListener('langchange', applyTeamDefaults);

$('join-code').addEventListener('input', () => {
  $('join-code').value = $('join-code').value.toUpperCase();
  if ($('join-code').value.length === 4) lookup();
});

async function lookup() {
  const code = $('join-code').value.trim().toUpperCase();
  if (code.length !== 4) return;
  $('join-error').textContent = '';
  try {
    lookedUp = await api(`/api/lookup?code=${code}`);
    // Already in this game? Straight back to the play screen.
    const existing = loadSession(code);
    if (existing?.playerId) return location.assign(`/play.html?code=${code}`);
    $('join-title').textContent = t('join.pickTeam', advText(lookedUp, 'title'));
    $('join-teams').innerHTML = lookedUp.teams.map((t, i) => `
      <label style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <input type="radio" name="team" value="${t.id}" ${i === 0 ? 'checked' : ''}>
        ${esc(t.name)}
      </label>`).join('');
    $('join-lookup').classList.remove('hidden');
  } catch (e) {
    lookedUp = null;
    $('join-lookup').classList.add('hidden');
    $('join-error').textContent = e.message;
  }
}

$('join-btn').addEventListener('click', async () => {
  const code = $('join-code').value.trim().toUpperCase();
  if (!lookedUp) return lookup();
  const name = $('join-name').value.trim();
  const teamId = document.querySelector('input[name=team]:checked')?.value;
  if (!name) return ($('join-error').textContent = t('join.enterName'));
  $('join-btn').disabled = true;
  try {
    const joined = await api('/api/join', { code, name, teamId });
    saveSession({ code, ...joined, name });
    location.assign(`/play.html?code=${code}`);
  } catch (e) {
    $('join-error').textContent = e.message;
    $('join-btn').disabled = false;
  }
});

// --- Host: create a game ---

// Quick-setup presets, first one being the house default. Playtesting put
// six puzzles inside eight minutes solo, so a quarter-hour suits six; the
// full ten-puzzle run (the only length that reaches the finale) gets either
// a tight fifteen or a comfortable thirty.
const PRESETS = [
  { puzzles: 6, minutes: 15 },
  { puzzles: 10, minutes: 15 },
  { puzzles: 10, minutes: 30 },
];
const DEFAULT_MINUTES = PRESETS[0].minutes;
const DEFAULT_PUZZLES = PRESETS[0].puzzles;
let chosenPuzzles = DEFAULT_PUZZLES;

// Light up whichever preset matches the current fields (if any).
function markActivePreset() {
  const mins = Number($('duration-min').value);
  const pz = Number($('puzzle-count').value);
  for (const btn of $('preset-row').querySelectorAll('button')) {
    btn.classList.toggle(
      'active',
      Number(btn.dataset.minutes) === mins && Number(btn.dataset.puzzles) === pz,
    );
  }
}

$('host-toggle').addEventListener('click', async () => {
  $('host-toggle').classList.add('hidden');
  $('host-form').classList.remove('hidden');
  try {
    const { adventures } = await api('/api/config');
    const renderOptions = () => {
      const current = $('adv-select').value;
      $('adv-select').innerHTML = adventures.map((a) =>
        `<option value="${a.slug}">${t('host.advOption', esc(advText(a, 'title')), a.puzzleCount)}</option>`
      ).join('');
      if (current) $('adv-select').value = current;
    };
    const showIntro = () => {
      const a = adventures.find((x) => x.slug === $('adv-select').value);
      $('adv-intro').textContent = a ? advText(a, 'intro') : '';
      if (a) {
        const MIN_PUZZLES = 5;
        const choices = [];
        for (let n = MIN_PUZZLES; n <= a.puzzleCount; n++) choices.push(n);
        if (!choices.length) choices.push(a.puzzleCount); // very short adventures
        $('puzzle-count').innerHTML = choices.map((n) =>
          `<option value="${n}">${n}${n === a.puzzleCount ? ' ✓' : ''}</option>`
        ).join('');
        // Preserve whatever the host already chose when they switch
        // adventures or flip language; otherwise fall back to the defaults.
        $('puzzle-count').value = choices.includes(chosenPuzzles)
          ? chosenPuzzles : choices[0];
        if (!$('duration-min').value) $('duration-min').value = DEFAULT_MINUTES;

        // Presets asking for more puzzles than this adventure has are hidden.
        $('preset-row').innerHTML = PRESETS
          .filter((ps) => ps.puzzles <= a.puzzleCount)
          .map((ps) => `<button type="button" class="secondary small-btn"
              data-puzzles="${ps.puzzles}" data-minutes="${ps.minutes}">
              ${t('host.preset', ps.puzzles, ps.minutes)}</button>`)
          .join('');
        for (const btn of $('preset-row').querySelectorAll('button')) {
          btn.onclick = () => {
            chosenPuzzles = Number(btn.dataset.puzzles);
            $('puzzle-count').value = chosenPuzzles;
            $('duration-min').value = btn.dataset.minutes;
            markActivePreset();
          };
        }
        markActivePreset();
      }
    };
    renderOptions();
    showIntro();
    document.addEventListener('langchange', () => { renderOptions(); showIntro(); });
    $('adv-select').addEventListener('change', showIntro);
    $('puzzle-count').addEventListener('change', () => {
      chosenPuzzles = Number($('puzzle-count').value) || DEFAULT_PUZZLES;
      markActivePreset();
    });
    $('duration-min').addEventListener('input', markActivePreset);
    if (!adventures.length) {
      $('create-error').textContent = t('host.noAdventures');
    }
  } catch (e) {
    $('create-error').textContent = e.message;
  }
});

$('create-btn').addEventListener('click', async () => {
  const teams = [$('team-1').value, $('team-2').value, $('team-3').value]
    .map((t) => t.trim()).filter(Boolean);
  $('create-btn').disabled = true;
  $('create-error').textContent = '';
  try {
    const game = await api('/api/create', {
      adventureSlug: $('adv-select').value,
      teams,
      durationMin: Number($('duration-min').value) || undefined,
      puzzleCount: Number($('puzzle-count').value) || undefined,
      adminToken: $('admin-token').value.trim() || undefined,
    });
    localStorage.setItem(`escape:host:${game.code}`, game.hostToken);
    location.assign(`/host.html?code=${game.code}`);
  } catch (e) {
    $('create-error').textContent = e.message;
    $('create-btn').disabled = false;
  }
});
