import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

test.describe('Usability: tour, tooltips, errors', () => {
  test('first-run tour hint is non-blocking and tour can be dismissed', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await page.evaluate(() => localStorage.removeItem('leaseup-report-guided-tour-v1'));
    await page.reload();
    await expect(page.getByTestId('brands-to-pitch')).toBeVisible({ timeout: 120_000 });

    const hint = page.getByTestId('report-first-run-tour-hint');
    const tour = page.getByTestId('report-first-run-tour');
    await expect(hint).toBeVisible({ timeout: 120_000 });
    await expect(tour).toBeHidden();
    await expect(page.getByTestId('report-summary')).toBeVisible();

    await page.getByTestId('report-tour-take').click();
    await expect(tour).toBeVisible();
    await expect(hint).toBeHidden();

    await page.getByTestId('report-tour-dismiss').click();
    await expect(tour).toBeHidden();
    await page.reload();
    await expect(page.getByTestId('brands-to-pitch')).toBeVisible({ timeout: 120_000 });
    await expect(hint).toBeHidden();
    await expect(tour).toBeHidden();
  });

  test('first-run hint can be dismissed without starting tour', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await page.evaluate(() => localStorage.removeItem('leaseup-report-guided-tour-v1'));
    await page.reload();
    await expect(page.getByTestId('report-first-run-tour-hint')).toBeVisible({ timeout: 120_000 });
    await page.getByTestId('report-tour-hint-dismiss').click();
    await expect(page.getByTestId('report-first-run-tour')).toBeHidden();
    await page.reload();
    await expect(page.getByTestId('report-first-run-tour-hint')).toBeHidden({ timeout: 120_000 });
  });

  test('metric tooltips open on focus', async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
      localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
    });
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await expect(page.getByTestId('brands-to-pitch')).toBeVisible({ timeout: 120_000 });
    const trigger = page
      .locator('[data-testid="brands-to-pitch"]')
      .locator('xpath=parent::*')
      .getByTestId('info-tooltip-trigger')
      .first();
    await trigger.hover();
    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 10_000 });
  });

  test('report error state explains next steps', async ({ page }) => {
    await page.goto(
      `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&simulateError=1`
    );
    const banner = page.getByTestId('report-error');
    await expect(banner).toBeVisible();
    await expect(banner.getByText('Our servers are busy')).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(banner.getByText(/demo example/i)).toBeVisible();
  });

  test('report and pitch avoid broker jargon in visible copy', async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
      localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
    });
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await expect(page.getByTestId('report-summary')).toBeVisible({ timeout: 120_000 });
    const reportText = await page.locator('main').innerText();
    expect(reportText.toLowerCase()).not.toContain('white space');
    expect(reportText.toLowerCase()).not.toContain('over-index');
    expect(reportText).not.toMatch(/\bAUC\b/);
  });

  test('axe on report with tour dismissed', async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
      localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
    });
    await page.goto(
      `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&screenshot=1`
    );
    await expect(page.getByTestId('brands-to-pitch')).toBeVisible({ timeout: 120_000 });
    const results = await new AxeBuilder({ page })
      .exclude('.maplibregl-map, .maplibregl-ctrl-group, .maplibregl-canvas')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(blocking).toEqual([]);
  });
});
