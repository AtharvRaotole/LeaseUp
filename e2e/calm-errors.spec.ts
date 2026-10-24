import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const AMBIGUOUS = '1574 N Milwaukee Ave, Chicago';

test.describe('Calm errors and geocode confirm', () => {
  test('503 on analyze shows retry message then Try again', async ({ page }) => {
    test.setTimeout(120_000);
    let hits = 0;
    await page.route('**/api/analyze/stream', async (route) => {
      hits += 1;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': BASE.replace(/\/$/, '') || 'http://localhost:4173',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ error: 'busy', code: 'SERVER_BUSY' }),
      });
    });
    await page.route('**/api/analyze', async (route) => {
      if (route.request().method() === 'POST') {
        hits += 1;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:4173',
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify({ error: 'busy', code: 'SERVER_BUSY' }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await expect(page.getByTestId('report-error-panel-retrying')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Our servers are busy. Trying again...')).toBeVisible();
    await expect(page.getByTestId('report-error')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Our servers are busy')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText(/failed to fetch|cors/i)).toHaveCount(0);
    expect(hits).toBeGreaterThanOrEqual(2);
  });

  test('ambiguous demo geocode shows picker with None of these', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`${BASE}/r/run?address=${encodeURIComponent(AMBIGUOUS)}&radius=10`);
    await expect(page.getByTestId('geocode-confirm')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Which storefront did you mean?')).toBeVisible();
    await expect(page.getByTestId('geocode-candidate-list')).toBeVisible();
    await expect(page.getByText('Wicker Park')).toBeVisible();
    await expect(page.getByText('Bucktown')).toBeVisible();
    await page.getByTestId('geocode-none-of-these').click();
    await expect(page).toHaveURL(/address=1574/);
    await expect(page.getByLabel('Street address')).toHaveValue(AMBIGUOUS);
  });
});
