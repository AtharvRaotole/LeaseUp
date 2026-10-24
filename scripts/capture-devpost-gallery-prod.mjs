#!/usr/bin/env node
/**
 * Capture Devpost gallery PNGs from production Pages (no local stack).
 * Usage: node scripts/capture-devpost-gallery-prod.mjs
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const BASE = process.env.GALLERY_BASE_URL || 'https://leaseup-59m.pages.dev';
const OUT = join(ROOT, 'docs/devpost/gallery');
const TOUR_KEY = 'leaseup-report-guided-tour-v1';

const BLEECKER_PATH = `/r/bleecker?address=${encodeURIComponent(
  '350 Bleecker St, New York, NY 10014'
)}&radius=10&screenshot=1&lat=40.73352&lng=-74.00271&pinConfirmed=1&neighborhood=${encodeURIComponent(
  'West Village'
)}&city=${encodeURIComponent('New York')}&resolved=${encodeURIComponent(
  '350 Bleecker Street, West Village, Manhattan, New York, NY 10014, United States'
)}`;

const CAPTURES = [
  {
    file: 'report-wicker-1440.png',
    viewport: { width: 1440, height: 900 },
    path: '/r/wicker?address=1560%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1',
    wait: 'report-summary',
    report: true,
  },
  {
    file: 'report-bleecker-1440.png',
    viewport: { width: 1440, height: 900 },
    path: BLEECKER_PATH,
    waitRace: ['report-summary', 'report-error'],
    report: true,
  },
  {
    file: 'report-boulder-1440.png',
    viewport: { width: 1440, height: 900 },
    path: '/r/boulder?address=1300%20Pearl%20St%2C%20Boulder%2C%20CO%2080302&radius=10&screenshot=1',
    wait: 'report-summary',
    report: true,
  },
  {
    file: 'report-sevierville-1440.png',
    viewport: { width: 1440, height: 900 },
    path: '/r/sevierville?address=125%20Collier%20Dr%2C%20Sevierville%2C%20TN%2037862&radius=10&screenshot=1',
    wait: 'report-summary',
    report: true,
  },
  {
    file: 'brand-1440.png',
    viewport: { width: 1440, height: 900 },
    path: '/brand/54617D9D-5EC7-45E0-8B7F-360DADB0FE7E?metro=chicago',
    wait: 'brand-opportunities',
  },
  {
    file: 'portfolio-1440.png',
    viewport: { width: 1440, height: 900 },
    path: '/portfolio',
    wait: 'portfolio-input',
  },
  {
    file: 'pitch-boulder-1440.png',
    viewport: { width: 1440, height: 900 },
    path: '/pitch/demo-boulder-ulta',
    wait: 'pitch-page',
  },
  {
    file: 'methodology-1440.png',
    viewport: { width: 1440, height: 900 },
    path: '/methodology',
    waitHeading: 'How LeaseUp ranks tenants',
    scroll: true,
  },
  {
    file: 'report-wicker-390.png',
    viewport: { width: 390, height: 844 },
    path: '/r/wicker?address=1560%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1',
    wait: 'report-summary',
    report: true,
  },
];

async function dismissTour(page) {
  await page.getByTestId('report-tour-hint-dismiss').click({ timeout: 3000 }).catch(() => undefined);
  await page.getByTestId('report-tour-dismiss').click({ timeout: 3000 }).catch(() => undefined);
}

async function waitReady(page, def) {
  if (def.waitRace) {
    await Promise.race(
      def.waitRace.map((id) => page.getByTestId(id).waitFor({ timeout: 120_000 }))
    );
    return;
  }
  if (def.wait) {
    await page.getByTestId(def.wait).waitFor({ timeout: 120_000 });
  } else if (def.waitHeading) {
    await page.getByRole('heading', { name: def.waitHeading }).waitFor({ timeout: 60_000 });
  }
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const def of CAPTURES) {
  const context = await browser.newContext({
    viewport: def.viewport,
    colorScheme: 'light',
  });
  await context.addInitScript((key) => localStorage.removeItem(key), TOUR_KEY);
  const page = await context.newPage();
  const url = `${BASE}${def.path}`;
  console.log('capture', def.file, url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180_000 });
  await waitReady(page, def);
  if (def.report) {
    await dismissTour(page);
    const summary = page.getByTestId('report-summary');
    await summary.scrollIntoViewIfNeeded();
  }
  if (def.scroll) {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
  }
  const outPath = join(OUT, def.file);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('wrote', outPath);
  await context.close();
}

await browser.close();
console.log('done', OUT);
