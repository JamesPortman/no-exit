// The language toggle must reach PUZZLE TEXT, not just the interface.
//
// This runs without ADVENTURE_KEY (as CI does), so it exercises the fixture
// adventure — the only translated content available keyless.
const { test, expect } = require('@playwright/test');

test('switching language re-renders the puzzle, and answers still work', async ({ browser, request }) => {
  const created = await (await request.post('/api/create', {
    data: { adventureSlug: 'test-adventure', teams: ['Red'] },
  })).json();
  const { code, hostToken } = created;
  await request.post('/api/host', { data: { code, hostToken, action: 'start' } });

  const page = await (await browser.newContext()).newPage();
  await page.goto(`/?join=${code}`);
  await page.fill('#join-name', 'Ana');
  await page.click('#join-btn');

  // English first.
  await expect(page.locator('#puzzle-title')).toContainText('Warm-up');
  await expect(page.locator('#puzzle-prompt')).toContainText('becomes shorter');

  // Switching language must swap the puzzle itself, not only the chrome.
  await page.selectOption('#lang-select', 'es');
  await expect(page.locator('#puzzle-title')).toContainText('Calentamiento');
  await expect(page.locator('#puzzle-prompt')).toContainText('se acorta');

  await page.selectOption('#lang-select', 'pt');
  await expect(page.locator('#puzzle-title')).toContainText('Aquecimento');
  await expect(page.locator('#puzzle-prompt')).toContainText('encurta');

  // An answer from ANOTHER language is still accepted: the toggle is a display
  // choice and must never invalidate something the player already worked out.
  await page.fill('#guess', 'short');
  await page.click('#submit');

  // The confirmation has to survive the puzzle advance it just caused —
  // rendering the next puzzle clears the feedback line, which used to wipe
  // this within milliseconds of it appearing.
  await expect(page.locator('#feedback')).toHaveClass(/good/);
  await expect(page.locator('#puzzle-title')).toContainText('O Meta');

  // …and then let go of it on its own, rather than sitting on the new puzzle.
  await expect(page.locator('#feedback')).toHaveText('', { timeout: 8000 });

  // The solve message the player keeps is in their chosen language.
  await expect(page.locator('#solved-log')).toContainText('seu primeiro dígito');
});
