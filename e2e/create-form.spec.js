// Coverage for the create form and the page chrome — the browser-side
// surfaces the unit suites structurally cannot reach (presets, the duration
// and puzzle-count fields, the language and theme toggles, the history page).
//
// Deliberately adventure-agnostic: it picks whatever ten-puzzle adventure the
// server offers, so it behaves the same in CI (fixtures only, no key) as on a
// machine that has ADVENTURE_KEY and sees the real ten.
const { test, expect } = require('@playwright/test');

// Creation is gated only when the server has ADMIN_TOKEN set; pass through
// whatever this environment uses so the spec works either way.
const HOST_KEY = process.env.ADMIN_TOKEN || '';

async function openHostForm(page) {
  await page.goto('/');
  await page.click('#host-toggle');
  await expect(page.locator('#adv-select option').first()).toBeAttached();
}

// Presets and the full-length game need an adventure with all ten puzzles.
async function selectFullLengthAdventure(page) {
  const opts = page.locator('#adv-select option');
  for (let i = 0; i < await opts.count(); i++) {
    const label = (await opts.nth(i).textContent()) || '';
    const m = /—\s*(\d+)\s/.exec(label);
    if (m && Number(m[1]) >= 10) {
      const value = await opts.nth(i).getAttribute('value');
      await page.selectOption('#adv-select', value);
      return { slug: value, puzzles: Number(m[1]) };
    }
  }
  throw new Error('no ten-puzzle adventure on offer');
}

test('presets fill both fields, and typing a custom time clears them', async ({ page }) => {
  await openHostForm(page);
  await selectFullLengthAdventure(page);

  const presets = page.locator('#preset-row button');
  await expect(presets).toHaveCount(3);
  await expect(presets.nth(0)).toHaveText(/6.*15/);
  await expect(presets.nth(2)).toHaveText(/10.*30/);

  // The house default is the first preset, already applied and highlighted.
  await expect(page.locator('#duration-min')).toHaveValue('15');
  await expect(page.locator('#puzzle-count')).toHaveValue('6');
  await expect(presets.nth(0)).toHaveClass(/active/);

  // Picking the long game moves both fields together.
  await presets.nth(2).click();
  await expect(page.locator('#duration-min')).toHaveValue('30');
  await expect(page.locator('#puzzle-count')).toHaveValue('10');
  await expect(presets.nth(2)).toHaveClass(/active/);
  await expect(presets.nth(0)).not.toHaveClass(/active/);

  // A hand-typed duration matches no preset, so none stays lit.
  await page.fill('#duration-min', '22');
  await expect(page.locator('#preset-row button.active')).toHaveCount(0);

  // Shortening is offered down to five, never below.
  const counts = await page.locator('#puzzle-count option').allTextContents();
  expect(counts[0].trim()).toBe('5');
  expect(counts).toHaveLength(6); // 5..10
});

test('a game created through the form runs at the chosen length', async ({ page, browser }) => {
  await openHostForm(page);
  const adventure = await selectFullLengthAdventure(page);

  await page.locator('#preset-row button').nth(2).click(); // 10 puzzles · 30 min
  await page.fill('#team-1', 'Form Team');
  await page.fill('#team-2', 'Second Team');
  await page.fill('#team-3', '');
  await page.fill('#admin-token', HOST_KEY);
  await page.click('#create-btn');

  // The form hands the host straight to their console.
  await page.waitForURL(/host\.html\?code=[A-Z2-9]{4}/);
  const code = new URL(page.url()).searchParams.get('code');
  await expect(page.locator('#code-display')).toHaveText(code);
  await expect(page.locator('#teams')).toContainText('Form Team');

  // A player joins and the game is exactly as long as the preset asked.
  const ctx = await browser.newContext();
  const player = await ctx.newPage();
  await player.goto(`/?join=${code}`);
  await player.fill('#join-name', 'Ava');
  await player.check('input[name=team][value=t1]');
  await player.click('#join-btn');
  await expect(player.locator('#view-lobby')).toBeVisible();

  await page.click('#start-btn');
  await expect(player.locator('#view-play')).toBeVisible({ timeout: 10_000 });
  await expect(player.locator('#dots .dot')).toHaveCount(adventure.puzzles);
  await expect(player.locator('#timer')).toHaveText(/^(30:00|29:[0-5]\d)$/);

  page.on('dialog', (d) => d.accept()); // "End the game for everyone?"
  await page.click('#end-btn');
  await expect(player.locator('#view-finished')).toBeVisible({ timeout: 10_000 });
  await ctx.close();
});

test('language and theme choices apply and survive a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#join-card h2')).toHaveText('Join a game');

  await page.selectOption('#lang-select', 'es');
  await expect(page.locator('#join-card h2')).toHaveText('Unirse a una partida');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');

  const theme = await page.locator('html').getAttribute('data-theme');
  await page.click('#theme-btn');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', theme || '');

  const flipped = await page.locator('html').getAttribute('data-theme');
  await page.reload();
  await expect(page.locator('#join-card h2')).toHaveText('Unirse a una partida');
  await expect(page.locator('html')).toHaveAttribute('data-theme', flipped);
});

test('the history page authenticates and renders', async ({ page }) => {
  await page.goto('/history.html');
  await page.fill('#admin-token', HOST_KEY);
  await page.click('#load-btn');

  await expect(page.locator('#error')).toHaveText('');
  // Either past games, or the empty-state when no database is configured.
  await expect(page.locator('#games')).toContainText(/No games recorded yet|puzzles/);
});
