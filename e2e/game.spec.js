// Full multi-team game through the real UI: a host console plus two player
// browsers race the fixture adventure, exercising wrong answers, hints,
// pause/resume, force-advance, and the final ranking.
const { test, expect } = require('@playwright/test');

test('host and two teams play a full game', async ({ browser, request }) => {
  test.setTimeout(120_000);

  // Create the game via API (the fixture adventure is hidden from the create
  // form on purpose), then drive everything else through the UI.
  const created = await (await request.post('/api/create', {
    data: { adventureSlug: 'test-adventure', teams: ['Red', 'Blue'] },
  })).json();
  const { code, hostToken } = created;

  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.addInitScript(
    ([c, t]) => localStorage.setItem(`escape:host:${c}`, t),
    [code, hostToken],
  );
  await hostPage.goto(`/host.html?code=${code}`);
  await expect(hostPage.locator('#code-display')).toHaveText(code);

  // Two players join through the landing page, one per team.
  const join = async (name, teamId) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/?join=${code}`);
    await page.fill('#join-name', name);
    await page.check(`input[name=team][value=${teamId}]`);
    await page.click('#join-btn');
    await expect(page.locator('#view-lobby')).toBeVisible();
    return page;
  };
  const alice = await join('Alice', 't1');
  const bob = await join('Bob', 't2');

  // Host sees the roster, then starts the game.
  await expect(hostPage.locator('#teams')).toContainText('Alice');
  await expect(hostPage.locator('#teams')).toContainText('Bob');
  await hostPage.click('#start-btn');
  await expect(alice.locator('#view-play')).toBeVisible({ timeout: 10_000 });
  await expect(alice.locator('#puzzle-title')).toContainText('Warm-up');

  // Wrong answer → feedback + host telemetry.
  await alice.fill('#guess', 'banana bread');
  await alice.click('#submit');
  await expect(alice.locator('#feedback')).toContainText('Not it');
  await expect(hostPage.locator('#teams')).toContainText('banana bread', { timeout: 10_000 });

  // Hint (accept the penalty confirm) → hint box appears, penalty shows.
  alice.on('dialog', (d) => d.accept());
  await alice.click('#hint-btn');
  await expect(alice.locator('.hint-box')).toContainText('XYZZY-FIXTURE-HINT-ONE-A');
  await expect(alice.locator('#penalty')).toContainText('1:00');

  // Solve puzzle 1 → solve message unlocks, puzzle 2 loads.
  await alice.fill('#guess', 'Short!');
  await alice.click('#submit');
  await expect(alice.locator('#solved-log')).toContainText('vault digit');
  await expect(alice.locator('#puzzle-title')).toContainText('The Meta');

  // Pause freezes Bob's screen; resume brings the puzzle back.
  await hostPage.click('#pause-btn');
  await expect(bob.locator('#view-paused')).toBeVisible({ timeout: 10_000 });
  await hostPage.click('#resume-btn');
  await expect(bob.locator('#view-play')).toBeVisible({ timeout: 10_000 });

  // Host force-advances Blue past puzzle 1 — Bob sees the host assist.
  hostPage.on('dialog', (d) => d.accept());
  await hostPage.locator('button[data-act=advance][data-team=t2]').click();
  await expect(bob.locator('#solved-log')).toContainText('host assist', { timeout: 10_000 });

  // Alice finishes the adventure.
  await alice.fill('#guess', '42 meta');
  await alice.click('#submit');
  await expect(alice.locator('#team-finished')).toBeVisible();

  // Host ends the game → both players see the ranking, Red on top.
  await hostPage.click('#end-btn');
  await expect(alice.locator('#view-finished')).toBeVisible({ timeout: 10_000 });
  const first = alice.locator('.rank-row').first();
  await expect(first).toContainText('Red');
  await expect(first).toContainText('2/2');
  await expect(hostPage.locator('#ranking')).toContainText('Red');

  // Refresh-resume: Alice reloads and lands back in the finished game.
  await alice.reload();
  await expect(alice.locator('#view-finished')).toBeVisible({ timeout: 10_000 });
});

test('a stranger cannot read game state', async ({ request }) => {
  const created = await (await request.post('/api/create', {
    data: { adventureSlug: 'test-adventure', teams: ['Solo'] },
  })).json();
  const res = await request.get(`/api/state?code=${created.code}&hostToken=wrong`);
  expect(res.status()).toBe(403);
});
