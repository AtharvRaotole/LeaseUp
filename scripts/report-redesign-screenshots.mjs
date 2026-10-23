/**
 * Report summary redesign screenshots (Boulder + Wicker).
 * Prereq: worker :8787 (APP_MODE=demo), web preview :4173
 * Usage: OUT_SUBDIR=before|after node scripts/report-redesign-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const sub = process.env.OUT_SUBDIR || 'after';
const OUT = join(process.cwd(), 'docs/screenshots/report-redesign', sub);

const SITES = [
  { slug: 'wicker', address: '1560 N Milwaukee Ave, Chicago, IL 60622' },
  { slug: 'boulder', address: '1300 Pearl St, Boulder, CO 80302' },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const site of SITES) {
  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      const path = `/r/${site.slug}?address=${encodeURIComponent(site.address)}&radius=10&screenshot=1`;
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      const readyId = sub === 'before' ? 'brands-to-pitch' : 'report-summary';
      await page.getByTestId(readyId).waitFor({ timeout: 120_000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const file = `${site.slug}-${width}-${theme}.png`;
      await page.screenshot({ path: join(OUT, file), fullPage: false });
      console.log('wrote', join(sub, file));
      await context.close();
    }
  }
}

await browser.close();
