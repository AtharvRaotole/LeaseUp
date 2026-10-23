/**
 * Full visual QA capture (local demo stack).
 * Prereq: worker :8787 APP_MODE=demo, preview :4173 with built web.
 *
 * OUT_SUBDIR=before|after node scripts/visual-qa-pass.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const BASE = (process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const API = (process.env.SCREENSHOT_API || 'http://127.0.0.1:8787').replace(/\/$/, '');
const sub = process.env.OUT_SUBDIR || 'after';
const OUT = join(process.cwd(), 'docs/screenshots/visual-qa', sub);
const WIDTHS = [390, 1024, 1440];

const DEMOS = [
  { slug: 'wicker', address: '1560 N Milwaukee Ave, Chicago, IL 60622' },
  { slug: 'boulder', address: '1300 Pearl St, Boulder, CO 80302' },
  { slug: 'sevierville', address: '125 Collier Dr, Sevierville, TN 37862' },
];

await mkdir(OUT, { recursive: true });

const analyzeRes = await fetch(`${API}/api/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: DEMOS[0].address, radius: 10 }),
});
if (!analyzeRes.ok) throw new Error(`analyze failed: ${analyzeRes.status}`);
const results = await analyzeRes.json();
const pitchRes = await fetch(`${API}/api/pitch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ results, radiusKm: 10 }),
});
if (!pitchRes.ok) throw new Error('pitch failed');
const pitch = await pitchRes.json();

const browser = await chromium.launch();

async function capture(page, name, { scrollLanding = false } = {}) {
  if (scrollLanding) {
    await page.evaluate(() => {
      document.documentElement.classList.add('screenshot-capture');
      for (const id of ['how-it-works', 'proof', 'built-for']) {
        document.getElementById(id)?.scrollIntoView({ block: 'center' });
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: join(OUT, name), fullPage: true });
  console.log('wrote', join(sub, name));
}

for (const theme of ['light', 'dark']) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      document.documentElement.classList.add('screenshot-capture');
    });

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('landing-plain-summary').waitFor({ timeout: 30_000 });
    await capture(page, `landing-${width}-${theme}.png`, { scrollLanding: true });

    for (const demo of DEMOS) {
      const q = new URLSearchParams({
        address: demo.address,
        radius: '10',
        screenshot: '1',
      });
      await page.goto(`${BASE}/r/${demo.slug}?${q}`, { waitUntil: 'domcontentloaded' });
      await page.getByTestId('report-top-brands').waitFor({ timeout: 120_000 });
      await capture(page, `report-${demo.slug}-${width}-${theme}.png`);
    }

    await page.goto(`${BASE}/pitch/${pitch.id}`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('pitch-pack-brief').waitFor({ timeout: 60_000 });
    await capture(page, `pitch-pack-${width}-${theme}.png`);

    await page.goto(`${BASE}/pipeline`, { waitUntil: 'networkidle' });
    await capture(page, `pipeline-${width}-${theme}.png`);

    await page.goto(`${BASE}/methodology`, { waitUntil: 'networkidle' });
    await capture(page, `methodology-${width}-${theme}.png`);

    await page.goto(
      `${BASE}/r/wicker?address=${encodeURIComponent(DEMOS[0].address)}&radius=10&simulateError=1`
    );
    await page.getByTestId('report-error').waitFor({ timeout: 30_000 });
    await capture(page, `error-server-busy-${width}-${theme}.png`);

    await page.goto(`${BASE}/r/run?address=${encodeURIComponent('1574 N Milwaukee Ave, Chicago')}&radius=10`);
    await page.getByTestId('geocode-confirm').waitFor({ timeout: 60_000 });
    await capture(page, `error-geocode-${width}-${theme}.png`);

    await context.close();
  }
}

await browser.close();
