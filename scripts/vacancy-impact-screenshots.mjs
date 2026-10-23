/**
 * Vacancy impact calculator screenshots (report + pitch).
 * Prereq: worker :8787 (APP_MODE=demo), web preview :4173
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const API = process.env.SCREENSHOT_API || 'http://localhost:8787';
const OUT = join(process.cwd(), 'docs/screenshots/vacancy-impact');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

const analyzeRes = await fetch(`${API}/api/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: WICKER, radius: 10 }),
});
const results = await analyzeRes.json();
const pitchRes = await fetch(`${API}/api/pitch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    results,
    radiusKm: 10,
    vacancy: {
      squareFeet: 2200,
      rentPerSqFtYear: 42,
      monthsVacant: 4,
      expectedMonthsToLeaseWithShortlist: 3,
      expectedMonthsToLeaseWithoutShortlist: 6,
    },
  }),
});
const pitch = await pitchRes.json();

const routes = [
  {
    name: 'report',
    path: `/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&screenshot=1`,
    prepare: async (page) => {
      await page.getByTestId('brands-to-pitch').waitFor({ timeout: 120000 });
      await page.getByTestId('vacancy-calculator').scrollIntoViewIfNeeded();
      await page.getByLabel('Square footage').fill('2200');
      await page.getByLabel('Asking rent ($/sq ft / year)').fill('42');
      await page.getByLabel('Months vacant so far').fill('4');
    },
  },
  {
    name: 'pitch',
    path: `/pitch/${pitch.id}`,
    prepare: async (page) => {
      await page.getByTestId('pitch-page').waitFor({ timeout: 60000 });
      await page.getByTestId('vacancy-calculator').scrollIntoViewIfNeeded();
    },
  },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' });
      await route.prepare(page);
      const file = `${route.name}-${width}-${theme}.png`;
      const locator = page.getByTestId('vacancy-calculator');
      await locator.screenshot({ path: join(OUT, file) });
      console.log('wrote', file);
      await context.close();
    }
  }
}

await browser.close();
