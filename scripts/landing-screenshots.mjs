/**
 * Landing page screenshots (local demo stack only).
 * Prereq: preview :4173
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const sub = process.env.OUT_SUBDIR || 'after';
const OUT = join(process.cwd(), 'docs/screenshots/landing-redesign', sub);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 1024, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('landing-plain-summary').waitFor({ timeout: 30_000 });
    const file = `landing-${width}-${theme}.png`;
    await page.screenshot({ path: join(OUT, file), fullPage: true });
    console.log('wrote', join(sub, file));
    await context.close();
  }
}

await browser.close();
