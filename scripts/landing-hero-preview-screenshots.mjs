import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = join(process.cwd(), 'docs/screenshots/landing-hero-preview');

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('landing-hero-product-preview').waitFor({ timeout: 30_000 });
    await page.screenshot({
      path: join(OUT, `landing-hero-${width}-${theme}.png`),
      fullPage: true,
    });
    console.log('wrote', `landing-hero-${width}-${theme}.png`);
    await context.close();
  }
}

await browser.close();
