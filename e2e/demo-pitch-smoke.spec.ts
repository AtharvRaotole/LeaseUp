import { test, expect } from '@playwright/test';

/** Stable demo share id (see @leaseup/contracts DEMO_PITCH_BOULDER_ULTA_ID). */
const DEMO_PITCH_BOULDER_ULTA_ID = 'demo-boulder-ulta';

const UNICODE_DASH = /[\u2013\u2014]/;

function isBenignConsoleError(text: string): boolean {
  return /favicon|404|devtools|Failed to load resource/i.test(text);
}

test('demo pitch page renders with clean console and plain copy', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(`/pitch/${DEMO_PITCH_BOULDER_ULTA_ID}`, { waitUntil: 'networkidle' });
  await expect(page.getByTestId('pitch-page')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('pitch-pack-brief')).toBeVisible();
  await expect(page.getByTestId('pitch-brand-brief').first()).toContainText(/Ulta/i);

  const visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toMatch(UNICODE_DASH);

  const severe = consoleErrors.filter((line) => !isBenignConsoleError(line));
  expect(severe).toEqual([]);
});
