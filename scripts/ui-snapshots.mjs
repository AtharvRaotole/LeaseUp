/**
 * Design QA screenshots (demo mode).
 * Prereq: worker :8787 (APP_MODE=demo), web preview :4173
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const OUT = join(process.cwd(), 'docs/screenshots');
const SHOT = '&screenshot=1';

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

function reportUrl(demo) {
  return `${BASE}/r/${demo.slug}?${demo.query}${SHOT}`;
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
    const height = width === 390 ? 844 : 900;
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(reportUrl(demo), { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Data confidence', { timeout: 90000 });
    await page.waitForTimeout(800);
    await shot(page, `report-${demo.slug}-${width}.png`, { fullPage: false });
    await page.close();
  }
}

const sevierville = demos.find((d) => d.slug === 'sevierville');
const wicker = demos[0];

const pageExpand = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageExpand.goto(reportUrl(sevierville), { waitUntil: 'networkidle' });
await pageExpand.waitForSelector('[data-testid="brands-to-pitch"]', { timeout: 90000 });
const firstPitch = pageExpand.locator('section:has([data-testid="brands-to-pitch"]) button').first();
await firstPitch.click();
await pageExpand.waitForTimeout(500);
await shot(pageExpand, 'report-sevierville-expanded.png', { fullPage: false });

const pageOutreach = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageOutreach.goto(reportUrl(sevierville), { waitUntil: 'networkidle' });
await pageOutreach.waitForSelector('text=Brands to pitch', { timeout: 90000 });
await pageOutreach.locator('section:has([data-testid="brands-to-pitch"]) button').first().click();
await pageOutreach.waitForTimeout(400);
await pageOutreach.getByRole('button', { name: 'Draft outreach email' }).click();
await pageOutreach.waitForTimeout(1200);
await shot(pageOutreach, 'report-outreach-sheet.png', { fullPage: false });

const pageEmpty = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageEmpty.goto(`${reportUrl(wicker)}&emptyPitch=1`, { waitUntil: 'networkidle' });
await pageEmpty.waitForSelector('text=No pitch list yet', { timeout: 90000 });
await shot(pageEmpty, 'report-empty-state.png', { fullPage: false });

const pageError = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageError.goto(`${BASE}/r/wicker?${wicker.query}&simulateError=1${SHOT}`, { waitUntil: 'networkidle' });
await pageError.waitForSelector('[data-testid="report-error"]', { timeout: 15000 });
await shot(pageError, 'report-error-state.png', { fullPage: false });

const pageHow = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pageHow.goto(reportUrl(wicker), { waitUntil: 'networkidle' });
await pageHow.waitForSelector('text=How we know', { timeout: 45000 });
await pageHow.getByRole('button', { name: 'Data sources' }).click();
await shot(pageHow, 'report-how-we-know.png', { fullPage: false });

const page390 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page390.goto(reportUrl(sevierville), { waitUntil: 'networkidle' });
await page390.waitForSelector('text=Data confidence', { timeout: 90000 });
await page390.waitForTimeout(600);
await shot(page390, 'report-390.png', { fullPage: false });

const pageDark = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'dark',
});
await pageDark.emulateMedia({ colorScheme: 'dark' });
await pageDark.goto(BASE, { waitUntil: 'networkidle' });
await shot(pageDark, 'landing-dark-1440.png', { fullPage: true });
await pageDark.goto(reportUrl(sevierville), { waitUntil: 'networkidle' });
await pageDark.waitForSelector('[data-testid="brands-to-pitch"]', { timeout: 90000 });
await shot(pageDark, 'report-sevierville-dark-1440.png', { fullPage: false });

await browser.close();
console.log('Done. Review docs/screenshots/ against DESIGN_SPEC checklist.');
