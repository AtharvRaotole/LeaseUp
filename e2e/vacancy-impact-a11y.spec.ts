import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const REPORT =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

test('axe vacancy impact panel has no serious/critical violations', async ({ page }) => {
  await page.goto(REPORT, { waitUntil: 'networkidle' });
  await page
    .locator('[data-testid="brands-to-pitch"]')
    .first()
    .waitFor({ timeout: 60_000 })
    .catch(() => undefined);
  await page.getByTestId('vacancy-calculator').scrollIntoViewIfNeeded();
  await page.getByLabel('Square footage').fill('1800');
  await page.getByLabel('Asking rent ($/sq ft / year)').fill('40');
  await page.getByLabel('Months vacant so far').fill('2');

  const results = await new AxeBuilder({ page })
    .include('[data-testid="vacancy-calculator"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  expect(blocking).toEqual([]);
});
