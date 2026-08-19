// Solo is the one mode a stranger can reach without a host, so it gets a
// browser test end to end: start a run, solve it, and see a personal best.
//
// The dev server runs with SOLO_TEST_SEED (see playwright.config.js), so the
// spec can generate the same adventure locally and know the answers. If a
// reused dev server was started without it, the solving half is skipped
// rather than failing on an unknowable run.
const { test, expect } = require('@playwright/test');
const { generate } = require('../api/_lib/solo/generate.js');

const EXPECTED = generate('e2e-solo-seed');

test('a solo run starts, plays, and records a personal best', async ({ page }) => {
  await page.goto('/solo.html');
  await page.evaluate(() => localStorage.removeItem('escape:solo:best'));

  await page.fill('#solo-name', 'Ada');
  await page.click('#solo-start');

  // Straight into play — no lobby, no waiting for a host.
  await page.waitForURL(/play\.html\?code=[A-Z2-9]{4}/);
  await expect(page.locator('#view-play')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#team-name')).toHaveText('Ada');
  await expect(page.locator('#dots .dot')).toHaveCount(EXPECTED.puzzles.length);
  await expect(page.locator('#timer')).toHaveText(/^(15:00|14:[0-5]\d)$/);
  // Nothing host-shaped on screen.
  await expect(page.locator('#broadcast')).toBeHidden();

  const seeded = (await page.locator('#puzzle-title').textContent() || '')
    .includes(EXPECTED.puzzles[0].title);
  test.skip(!seeded, 'dev server was started without SOLO_TEST_SEED');

  // A wrong answer is rejected, then work through the whole run.
  await page.fill('#guess', 'definitely not the answer');
  await page.click('#submit');
  await expect(page.locator('#feedback')).toContainText('Not it');

  for (const puzzle of EXPECTED.puzzles) {
    await expect(page.locator('#puzzle-title')).toContainText(puzzle.title);
    await page.fill('#guess', puzzle.answers[0]);
    await page.click('#submit');
  }

  // Finishing the last puzzle ends the run by itself — no host to end it.
  await expect(page.locator('#view-finished')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#ranking')).toContainText('7/7');
  await expect(page.locator('#ranking')).toContainText('personal best');

  // The best survives a reload and is offered back on the solo page.
  await page.goto('/solo.html');
  await expect(page.locator('#solo-best')).toBeVisible();
  await expect(page.locator('#solo-best')).toContainText('Your best so far');
});

test('a solo run is private: it cannot be joined or looked up', async ({ page, request }) => {
  const run = await (await request.post('/api/solo', { data: { name: 'Ada' } })).json();
  expect(run.code).toMatch(/^[A-Z2-9]{4}$/);
  expect(JSON.stringify(run)).not.toContain('hostToken');

  // The join page must not even admit the code exists.
  expect((await request.get(`/api/lookup?code=${run.code}`)).status()).toBe(404);
  const joined = await request.post('/api/join',
    { data: { code: run.code, name: 'Gatecrasher', teamId: 't1' } });
  expect(joined.status()).toBe(400);

  await page.goto(`/?join=${run.code}`);
  await expect(page.locator('#join-error')).toContainText(/not found/i);
});
