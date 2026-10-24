import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';

const EMPTY_BOARD = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  shareId: '00000000-0000-4000-8000-000000000002',
  cards: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test.describe('Empty pipeline', () => {
  test('empty board shows explanation and next action', async ({ page }) => {
    const origin = BASE.replace(/\/$/, '');
    await page.route('**/api/pipeline', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify(EMPTY_BOARD),
      });
    });

    await page.goto(`${BASE}/pipeline`);
    await expect(page.getByTestId('pipeline-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pipeline-empty')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Save brands from a report or pitch pack/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run a site analysis' })).toBeVisible();
  });
});
