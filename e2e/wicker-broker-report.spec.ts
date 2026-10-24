import { test, expect } from '@playwright/test';
import { openReportSection, waitForReportReady } from './report-helpers';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

test.describe('Wicker demo report — broker cards', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Who shops here card', async ({ page }) => {
    await page.goto(WICKER);
    await waitForReportReady(page);
    const card = page.getByTestId('who-shops-here');
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card).toContainText('Who shops here');
    await expect(card).toContainText('Beer Enthusiasts');
  });

  test('Who to contact (brand reach line)', async ({ page }) => {
    await page.goto(WICKER);
    await waitForReportReady(page);
    await openReportSection(page, 'report-section-why-brands');
    const pitch = page.getByTestId('brands-to-pitch-full-list');
    await expect(pitch).toBeVisible({ timeout: 30_000 });
    await pitch.locator('li').first().locator('button').first().click();
    const reach = page.getByTestId('brand-reach-line');
    await expect(reach).toBeVisible({ timeout: 10_000 });
    await expect(reach).toContainText('How to reach them');
    await expect(reach).not.toContainText('source:');
    const link = reach.getByRole('link');
    if (await link.count()) {
      await expect(link.first()).toBeVisible();
      await expect(link.first()).not.toHaveText(/^https?:/);
    } else {
      await expect(reach).toContainText(/Search for their real estate contact/);
    }
  });
});
