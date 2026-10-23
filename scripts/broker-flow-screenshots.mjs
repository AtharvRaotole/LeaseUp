/**
 * Broker journey screenshots for usability QA (demo wicker report).
 * Prereq: preview :4173 + worker :8790 APP_MODE=demo
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = process.env.SCREENSHOT_OUT || join(process.cwd(), 'docs/screenshots/broker-flow');
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

const STEPS = [
  { name: 'landing', path: '/', wait: 400 },
  {
    name: 'report',
    path: `/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&screenshot=1`,
    waitFor: '[data-testid="brands-to-pitch"]',
  },
  {
    name: 'report-map-mobile',
    path: `/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10&screenshot=1`,
    mobileOnly: true,
    after: async (page) => {
      await page.getByRole('button', { name: 'Map' }).click();
      await page.waitForTimeout(600);
    },
    waitFor: '[data-testid="brands-to-pitch"]',
  },
  {
    name: 'pipeline',
    path: '/pipeline',
    waitFor: '[data-testid="pipeline-page"]',
  },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const width of [1440, 390]) {
  const height = width === 390 ? 844 : 900;
  for (const step of STEPS) {
    if (step.mobileOnly && width !== 390) continue;
    const page = await browser.newPage({ viewport: { width, height } });
    if (step.path.includes('/r/')) {
      await page.addInitScript(() => {
        localStorage.setItem('leaseup-report-guided-tour-v1', 'done');
      });
    }
    await page.goto(`${BASE}${step.path}`, { waitUntil: 'networkidle' });
    if (step.waitFor) {
      await page.locator(step.waitFor).first().waitFor({ timeout: 120_000 });
    }
    if (step.after) await step.after(page);
    await page.waitForTimeout(step.wait ?? 500);
    const file = join(OUT, `${step.name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: step.name === 'landing' });
    console.log('saved', file);
    await page.close();
  }
}

await browser.close();
