/**
 * Screenshots for brand reverse and portfolio pages.
 * Prereq: worker :8787 (APP_MODE=demo), web preview :4173
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const OUT = join(process.cwd(), 'docs/screenshots/features');

const API = process.env.SCREENSHOT_API || 'http://localhost:8787';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

let pitchPath = process.env.PITCH_SCREENSHOT_PATH;
if (!pitchPath) {
  const analyzeRes = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: WICKER, radius: 10 }),
  });
  const results = await analyzeRes.json();
  const pitchRes = await fetch(`${API}/api/pitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, radiusKm: 10 }),
  });
  const pitch = await pitchRes.json();
  pitchPath = `/pitch/${pitch.id}`;
  console.log('pitch screenshot path', pitchPath);
}

const pages = [
  { name: 'brand-reverse', path: '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E' },
  { name: 'portfolio', path: '/portfolio' },
  { name: 'pitch-pack', path: pitchPath, testId: 'pitch-page' },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    for (const pageDef of pages) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto(`${BASE}${pageDef.path}`, { waitUntil: 'networkidle' });
      if (pageDef.name === 'brand-reverse') {
        await page.getByTestId('brand-opportunities').waitFor({ timeout: 90000 });
      } else if (pageDef.testId) {
        await page.getByTestId(pageDef.testId).waitFor({ timeout: 90000 });
      } else {
        await page.getByTestId('portfolio-input').waitFor({ timeout: 30000 });
      }
      await page.waitForTimeout(800);
      const file = `${pageDef.name}-${theme}-${width}.png`;
      await page.screenshot({ path: join(OUT, file), fullPage: true });
      console.log('saved', join(OUT, file));
      await context.close();
    }
  }
}

await browser.close();
