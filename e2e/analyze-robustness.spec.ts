import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173';
const AMBIGUOUS = '1574 N Milwaukee Ave, Chicago';
const CONFIRMED_RURAL = '1 Main St, Chicken, AK 99732';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': BASE.replace(/\/$/, '') || 'http://localhost:4173',
    'Access-Control-Allow-Credentials': 'true',
  };
}

test.describe('Analyze robustness (typed addresses)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.unroute('**/api/geocode').catch(() => undefined);
    await page.unroute('**/api/analyze/stream').catch(() => undefined);
  });

  test('ambiguous address shows geocode picker', async ({ page }) => {
    await page.goto(`${BASE}/r/run?address=${encodeURIComponent(AMBIGUOUS)}&radius=10`);
    await expect(page.getByTestId('geocode-confirm')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Which storefront did you mean?')).toBeVisible();
  });

  test('PO box shows calm geocode error with next step', async ({ page }) => {
    await page.goto(
      `${BASE}/r/run?address=${encodeURIComponent('PO Box 99, Austin, TX 78701')}&radius=10`
    );
    await expect(page.getByTestId('report-error')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('PO boxes cannot be mapped', { exact: true })).toBeVisible();
    await expect(page.getByText(/street address of the retail space/i)).toBeVisible();
  });

  test('non-US address shows calm geocode error', async ({ page }) => {
    await page.goto(
      `${BASE}/r/run?address=${encodeURIComponent('10 Downing St, London, England')}&radius=10`
    );
    await expect(page.getByTestId('report-error')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('US storefronts only')).toBeVisible();
  });

  test('gibberish shows unrecognized address copy', async ({ page }) => {
    await page.goto(`${BASE}/r/run?address=${encodeURIComponent('xkjq mxzq qwerty')}&radius=10`);
    await expect(page.getByTestId('report-error')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Address not recognized')).toBeVisible();
  });

  test('geocode timeout shows retry guidance', async ({ page }) => {
    await page.route('**/api/geocode', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: corsHeaders(),
        body: JSON.stringify({
          code: 'GEOCODE_TIMEOUT',
          error: 'Address lookup timed out. Check the spelling and try again in a moment.',
        }),
      });
    });
    await page.goto(
      `${BASE}/r/run?address=${encodeURIComponent('500 W 2nd St, Austin, TX 78701')}&radius=10`
    );
    await expect(page.getByTestId('report-error')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Address lookup timed out', { exact: true })).toBeVisible();
  });

  test('rural site with no stores shows short list notice, not rankings', async ({ page }) => {
    const ruralBody = {
      location: {
        address: CONFIRMED_RURAL,
        latitude: 64.073,
        longitude: -141.936,
        neighborhood: 'Chicken',
        city: 'Chicken',
        resolvedAddress: CONFIRMED_RURAL,
      },
      backtest: {
        totalStores: 0,
        predictedStores: 0,
        accuracy: 0,
        precisionAt10: 0,
        presentInTop10: 0,
        auc: 0,
        examples: [],
      },
      prospects: [],
      dataQuality: 'insufficient',
      warnings: [
        'No taste-ranked brands for this pin yet',
        'Try a nearby town with retail, widen the radius, or pick a demo example on the home page',
      ],
      runId: 'rural-mock',
      timestamp: new Date().toISOString(),
      mode: 'live',
    };

    await page.route('**/api/geocode', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(),
        body: JSON.stringify({
          needsConfirmation: false,
          candidates: [],
          location: ruralBody.location,
        }),
      });
    });

    await page.route('**/api/analyze/stream', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const sse = `event: complete\ndata: ${JSON.stringify(ruralBody)}\n\n`;
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'text/event-stream; charset=utf-8',
        },
        body: sse,
      });
    });

    await page.goto(
      `${BASE}/r/run?address=${encodeURIComponent(CONFIRMED_RURAL)}&radius=25`
    );
    await expect(page.getByTestId('report-short-list-notice')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/No brands passed store checks/i)).toBeVisible();
    await expect(page.getByText(/fabricated|chain size only/i)).toHaveCount(0);
  });

  test('Qloo down uses chain-size fallback with banner and pitch list', async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_QLOO_DOWN !== '1', 'Requires worker FORCE_QLOO_DOWN=1');
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    const banner = page.getByTestId('taste-unavailable-banner');
    await expect(banner).toBeVisible({ timeout: 90_000 });
    await expect(banner).toContainText(/ranked by chain size only/i);
    await waitForReportReady(page);
    await expect(page.getByText(/taste fit/i)).toHaveCount(0);
    await expect(page.getByTestId('brands-to-pitch').locator('li').first()).toBeVisible();
    await expect(page.getByTestId('report-error')).toHaveCount(0);
  });
});
