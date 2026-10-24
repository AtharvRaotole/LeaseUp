import { test, expect } from '@playwright/test';
import {
  analyzeBlockingViolations,
  createPitchPath,
  preparePitchPage,
  prepareReportPage,
} from './a11y-helpers';

const API = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8787';
const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

const ROUTES: Array<{
  name: string;
  path: string;
  ready?: (page: import('@playwright/test').Page) => Promise<void>;
}> = [
  { name: 'landing', path: '/' },
  { name: 'methodology', path: '/methodology' },
  { name: 'pipeline', path: '/pipeline' },
  { name: 'watchlist', path: '/watchlist' },
  { name: 'not-found', path: '/this-route-does-not-exist' },
  {
    name: 'report',
    path: WICKER,
    ready: prepareReportPage,
  },
];

let pitchPath = '';

test.beforeAll(async () => {
  pitchPath = await createPitchPath(API);
});

for (const route of ROUTES) {
  test(`axe ${route.name} has no serious or critical violations`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    if (route.ready) await route.ready(page);
    const blocking = await analyzeBlockingViolations(page);
    if (blocking.length > 0) {
      console.log(
        route.name,
        blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
      );
    }
    expect(blocking).toEqual([]);
  });
}

test('axe pitch pack has no serious or critical violations', async ({ page }) => {
  await page.goto(pitchPath, { waitUntil: 'networkidle' });
  await preparePitchPage(page);
  const blocking = await analyzeBlockingViolations(page);
  expect(blocking).toEqual([]);
});
