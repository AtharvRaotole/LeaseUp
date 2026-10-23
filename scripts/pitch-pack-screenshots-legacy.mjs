import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const API = process.env.SCREENSHOT_API || 'http://127.0.0.1:8787';
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/pitch-pack/before');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

await mkdir(OUT, { recursive: true });

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/pitch/${pitch.id}`);
await page.getByTestId('pitch-page').waitFor({ timeout: 60_000 });

await page.screenshot({ path: join(OUT, 'pitch-pack-1440.png'), fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: join(OUT, 'pitch-pack-390.png'), fullPage: true });
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: join(OUT, 'pitch-pack-390-dark.png'), fullPage: true });
await page.emulateMedia({ colorScheme: 'light' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.pdf({
  path: join(OUT, 'pitch-pack-letter.pdf'),
  format: 'Letter',
  printBackground: true,
  margin: { top: '0.55in', right: '0.65in', bottom: '0.55in', left: '0.65in' },
});

await browser.close();
console.log('saved to', OUT);
