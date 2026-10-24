import { test, expect } from '@playwright/test';
import { BROKER_RAW_JARGON_PATTERNS, findBrokerJargonViolations } from '../apps/web/src/lib/broker-visible-jargon';
import { createPitchPath, prepareReportPage } from './a11y-helpers';
import { collectVisibleBrokerText, expectNoBrokerJargon } from './broker-jargon-helpers';
import { waitForReportReady } from './report-helpers';

const API = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8787';
const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

const ROUTES: Array<{
  name: string;
  path: string;
  ready?: (page: import('@playwright/test').Page) => Promise<void>;
}> = [
  {
    name: 'report',
    path: WICKER,
    ready: prepareReportPage,
  },
  { name: 'methodology', path: '/methodology' },
  { name: 'pipeline', path: '/pipeline' },
  { name: 'watchlist', path: '/watchlist' },
  {
    name: 'brand',
    path: '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E?metro=chicago',
  },
  { name: 'portfolio', path: '/portfolio' },
];

let pitchPath = '';

test.beforeAll(async () => {
  pitchPath = await createPitchPath(API);
});

for (const route of ROUTES) {
  test(`broker jargon ${route.name} has no unexplained raw terms in visible UI`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    if (route.ready) await route.ready(page);
    const text = await collectVisibleBrokerText(page);
    const violations = findBrokerJargonViolations(text);
    expect(
      violations,
      `Forbidden jargon in ${route.name}: ${violations.join(', ')}\nPatterns: ${BROKER_RAW_JARGON_PATTERNS.map((p) => p.id).join(', ')}`
    ).toEqual([]);
  });
}

test('broker jargon pitch pack has no unexplained raw terms in visible UI', async ({ page }) => {
  await page.goto(pitchPath, { waitUntil: 'networkidle' });
  await page.getByTestId('pitch-pack-brief').waitFor({ timeout: 60_000 });
  await expectNoBrokerJargon(page, 'pitch');
});

test('broker jargon pipeline CRM dialog has no unexplained raw terms in visible UI', async ({ page }) => {
  test.setTimeout(180_000);
  const wicker =
    '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';
  await page.goto(wicker, { waitUntil: 'networkidle' });
  await waitForReportReady(page);
  await page.getByTestId('report-primary-actions').getByTestId('add-to-pipeline').click();
  await expect(page.getByText('Added to pipeline')).toBeVisible({ timeout: 30_000 });
  await page.goto('/pipeline', { waitUntil: 'networkidle' });
  await page.getByTestId('pipeline-card').first().click();
  await page.getByTestId('pipeline-card-dialog').waitFor({ timeout: 15_000 });
  await expectNoBrokerJargon(page, 'pipeline CRM');
});

test('broker jargon qloo-down fallback banner has no unexplained raw terms in visible UI', async ({
  page,
}) => {
  test.skip(process.env.PLAYWRIGHT_QLOO_DOWN !== '1', 'requires worker with FORCE_QLOO_DOWN=1');
  test.setTimeout(120_000);
  const wicker =
    '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';
  await page.goto(wicker, { waitUntil: 'networkidle' });
  await page.getByTestId('taste-unavailable-banner').waitFor({ timeout: 90_000 });
  await expectNoBrokerJargon(page, 'qloo-down report');
});
