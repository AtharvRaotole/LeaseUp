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
    const preview = page.getByTestId('landing-hero-product-preview');
    await preview.waitFor({ timeout: 30_000 });
    await preview.scrollIntoViewIfNeeded();
    await page
      .getByTestId('landing-hero-preview-img-light')
      .or(page.getByTestId('landing-hero-preview-img-dark'))
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(
      () => {
        const light = document.querySelector('[data-testid="landing-hero-preview-img-light"]');
        const dark = document.querySelector('[data-testid="landing-hero-preview-img-dark"]');
        const el =
          light instanceof HTMLImageElement && light.offsetParent !== null
            ? light
            : dark instanceof HTMLImageElement
              ? dark
              : null;
        return el instanceof HTMLImageElement && el.naturalWidth > 0;
      },
      { timeout: 15_000 }
    );
    await page.screenshot({
      path: join(OUT, `landing-hero-${width}-${theme}.png`),
      fullPage: true,
    });
    console.log('wrote', `landing-hero-${width}-${theme}.png`);
    await context.close();
  }
}

await browser.close();
