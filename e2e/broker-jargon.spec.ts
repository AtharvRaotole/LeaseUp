import { test, expect } from '@playwright/test';
import {
  BROKER_RAW_JARGON_PATTERNS,
  findBrokerJargonViolations,
} from '../apps/web/src/lib/broker-visible-jargon';
import { createPitchPath, prepareReportPage } from './a11y-helpers';

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

async function visibleMainText(page: import('@playwright/test').Page): Promise<string> {
  const main = page.locator('#main-content');
  await main.waitFor({ state: 'visible' });
  const chunks = await main.locator(':visible').allInnerTexts();
  return chunks.join('\n');
}

for (const route of ROUTES) {
  test(`broker jargon ${route.name} has no unexplained raw terms in visible UI`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    if (route.ready) await route.ready(page);
    const text = await visibleMainText(page);
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
  const text = await visibleMainText(page);
  const violations = findBrokerJargonViolations(text);
  expect(violations).toEqual([]);
});
