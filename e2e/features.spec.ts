import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const DEMO_BRAND = '54617D9D-5EC7-45E0-8B7F-360DADB0FE7E';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const BOULDER = '1125 Pearl St, Boulder, CO 80302';

test.describe('LeaseUp feature pages (demo)', () => {
  test('brand reverse end to end on recorded fixtures', async ({ page }) => {
    await page.goto(`${BASE}/brand/${DEMO_BRAND}?metro=chicago`);
    await expect(page.getByTestId('brand-reverse-page')).toBeVisible({ timeout: 60000 });
    await expect(page.getByTestId('brand-opportunities')).toBeVisible({ timeout: 90000 });
    await expect(page.getByText(/\d+ of [\d,]+ areas/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Site report' }).first()).toBeVisible();
    await page.locator('select').selectOption('denver');
    await expect(page).toHaveURL(/metro=denver/);
  });

  test('portfolio paste, analyze, reload, and export', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`${BASE}/portfolio`);
    await page.getByTestId('portfolio-input').fill(`${WICKER}\n${BOULDER}`);
    await page.getByRole('button', { name: 'Geocode and analyze' }).click();
    await expect(page.getByTestId('portfolio-table')).toBeVisible({ timeout: 120000 });
    // Live Nominatim can return ambiguous matches; confirm the top one and start the run if needed.
    if (await page.getByText('Needs confirmation').first().isVisible().catch(() => false)) {
      await page.getByTestId('portfolio-timeline').getByRole('button').first().click();
      const run = page.getByRole('button', { name: 'Run analyses' });
      if (await run.isEnabled().catch(() => false)) await run.click();
    }
    await expect(page.getByText('Complete').first()).toBeVisible({ timeout: 180000 });
    const share = page.getByText(/\/portfolio\//);
    await expect(share).toBeVisible();
    const href = await share.textContent();
    const id = href?.trim().split('/portfolio/')[1];
    expect(id).toBeTruthy();
    await page.goto(`${BASE}/portfolio/${id}`);
    await expect(page.getByTestId('portfolio-table')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Complete').first()).toBeVisible({ timeout: 60000 });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toContain('leaseup-portfolio');
  });

  test('share pitch from site report', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(
      `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`
    );
    await expect(page.getByTestId('brands-to-pitch')).toBeVisible({ timeout: 120000 });
    await page.getByTestId('share-pitch').click();
    await page.getByRole('button', { name: 'Create public link' }).click();
    await expect(page.getByText(/\/pitch\//)).toBeVisible({ timeout: 30000 });
    const linkText = await page.locator('a[href*="/pitch/"]').first().getAttribute('href');
    expect(linkText).toMatch(/\/pitch\//);
    await page.goto(linkText!);
    await expect(page.getByTestId('pitch-page')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Top brands to pitch')).toBeVisible();
    await expect(page.getByTestId('vacancy-calculator')).toBeVisible();
  });

  test('mobile menu exposes brand and portfolio links', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: 'Brand sites' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible();
  });
});
