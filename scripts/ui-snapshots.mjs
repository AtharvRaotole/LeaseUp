/**
 * Design QA screenshots (demo mode).
 * Prereq: worker :8787 (APP_MODE=demo), web preview :4173
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const OUT = join(process.cwd(), 'docs/screenshots');

const demos = [
  { slug: 'wicker', query: 'address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10' },
  { slug: 'boulder', query: 'address=1125%20Pearl%20St%2C%20Boulder%2C%20CO%2080302&radius=10' },
  { slug: 'sevierville', query: 'address=125%20Collier%20Dr%2C%20Sevierville%2C%20TN%2037862&radius=10' },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(page, name, opts = {}) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: opts.fullPage ?? false });
  console.log('saved', path);
}

for (const width of [1440, 1280, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await shot(page, `landing-${width}.png`, { fullPage: true });
  await page.close();
}

for (const demo of demos) {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${BASE}/r/${demo.slug}?${demo.query}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Data confidence', { timeout: 90000 });
    await page.waitForTimeout(800);
    await shot(page, `report-${demo.slug}-${width}.png`, { fullPage: true });
    await page.close();
  }
}

const sevierville = demos.find((d) => d.slug === 'sevierville');
const wicker = demos[0];
const pageExpand = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageExpand.goto(`${BASE}/r/wicker?${wicker.query}`, { waitUntil: 'networkidle' });
await pageExpand.waitForSelector('[data-testid="brands-to-pitch"]', { timeout: 90000 });
const pitchCard = pageExpand.locator('[data-testid="brands-to-pitch"]').locator('xpath=../following-sibling::*//button').first();
if (await pitchCard.count()) await pitchCard.click();
await pageExpand.waitForTimeout(500);
await shot(pageExpand, 'report-wicker-expanded.png', { fullPage: true });
await pageExpand.close();

const pageOutreach = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageOutreach.goto(`${BASE}/r/sevierville?${sevierville.query}`, { waitUntil: 'networkidle' });
await pageOutreach.waitForSelector('text=Brands to pitch', { timeout: 90000 });
const firstPitch = pageOutreach.locator('section:has([data-testid="brands-to-pitch"]) button').first();
await firstPitch.click();
await pageOutreach.waitForTimeout(400);
await pageOutreach.getByRole('button', { name: 'Draft outreach email' }).click();
await pageOutreach.waitForTimeout(1200);
await shot(pageOutreach, 'report-outreach-sheet.png', { fullPage: false });

const pageEmpty = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageEmpty.goto(`${BASE}/r/wicker?${demos[0].query}&emptyPitch=1`, { waitUntil: 'networkidle' });
await pageEmpty.waitForSelector('text=No pitch list yet', { timeout: 90000 });
await shot(pageEmpty, 'report-empty-state.png', { fullPage: true });

const pageError = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageError.goto(`${BASE}/r/wicker?${demos[0].query}&simulateError=1`, { waitUntil: 'networkidle' });
await pageError.waitForSelector('[data-testid="report-error"]', { timeout: 15000 });
await shot(pageError, 'report-error-state.png', { fullPage: true });

const pageHow = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageHow.goto(`${BASE}/r/wicker?${demos[0].query}`, { waitUntil: 'networkidle' });
await pageHow.waitForSelector('text=How we know', { timeout: 45000 });
await pageHow.getByRole('button', { name: 'Data sources' }).click();
await shot(pageHow, 'report-how-we-know.png', { fullPage: true });

const page390 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page390.goto(`${BASE}/r/sevierville?${sevierville.query}`, { waitUntil: 'networkidle' });
await page390.waitForSelector('text=Data confidence', { timeout: 90000 });
await page390.waitForTimeout(600);
await shot(page390, 'report-390.png', { fullPage: true });

const pageDark = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'dark',
});
await pageDark.emulateMedia({ colorScheme: 'dark' });
await pageDark.goto(BASE, { waitUntil: 'networkidle' });
await shot(pageDark, 'landing-dark-1440.png', { fullPage: true });
await pageDark.goto(`${BASE}/r/sevierville?${sevierville.query}`, { waitUntil: 'networkidle' });
await pageDark.waitForSelector('[data-testid="brands-to-pitch"]', { timeout: 90000 });
await shot(pageDark, 'report-sevierville-dark-1440.png', { fullPage: true });

await browser.close();
console.log('Done. Review docs/screenshots/ against DESIGN_SPEC checklist.');
