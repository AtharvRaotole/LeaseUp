/**
 * Report + pitch screenshots for broker usability passes.
 * Prereq: local worker :8787 (demo/fixtures), web preview :4173
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const API = process.env.SCREENSHOT_API || 'http://127.0.0.1:8787';
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/usability-broker/after');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function reportShots(page, label) {
  await page.goto(
    `${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&screenshot=1`,
    { waitUntil: 'networkidle' }
  );
  await page.getByTestId('report-summary').waitFor({ timeout: 120_000 });
  await page.getByTestId('report-tour-dismiss').click({ timeout: 5000 }).catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(OUT, `report-wicker-1440-${label}.png`), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(OUT, `report-wicker-390-${label}.png`), fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function pitchShots(page) {
  const analyzeRes = await fetch(`${API}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: WICKER, radius: 10 }),
  });
  if (!analyzeRes.ok) throw new Error('analyze failed');
  const results = await analyzeRes.json();
  const pitchRes = await fetch(`${API}/api/pitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, radiusKm: 10 }),
  });
  if (!pitchRes.ok) throw new Error('pitch failed');
  const pitch = await pitchRes.json();
  await page.goto(`${BASE}/pitch/${pitch.id}`);
  await page.getByTestId('pitch-pack-brief').waitFor({ timeout: 60_000 });
  await page.screenshot({ path: join(OUT, 'pitch-pack-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(OUT, 'pitch-pack-390.png'), fullPage: true });
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await reportShots(page, 'light');
await pitchShots(page);
await browser.close();
console.log('saved to', OUT);
