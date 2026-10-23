/**
 * Capture landing + report typography prototypes at 1440 and 390.
 * Usage: SCREENSHOT_BASE=http://127.0.0.1:4173 node scripts/type-options-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = join(process.cwd(), 'docs/screenshots/type-options');
const REPORT =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';

const PAIRINGS = ['schibsted', 'general-newsreader', 'figtree'];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const pairing of PAIRINGS) {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const q = `typepair=${pairing}`;
    await page.goto(`${BASE}/?${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: join(OUT, `landing-${pairing}-${width}.png`),
      fullPage: true,
    });
    await page.goto(`${BASE}${REPORT}&${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: join(OUT, `report-${pairing}-${width}.png`),
      fullPage: true,
    });
    await page.close();
  }
}

await browser.close();
console.log('Wrote screenshots to', OUT);
