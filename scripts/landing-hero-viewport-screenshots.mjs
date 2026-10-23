#!/usr/bin/env node
/** Hero-only landing screenshots (1440 light + 390 light). */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:4173';
const OUT = join(process.cwd(), 'docs/screenshots/landing-hero-preview');

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const { width, name } of [
  { width: 1440, name: 'landing-hero-1440-light' },
  { width: 390, name: 'landing-hero-390-light' },
]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.getByTestId('landing-hero-product-preview').waitFor({ timeout: 30_000 });
  const hero = page.locator('main section').first();
  await hero.screenshot({ path: join(OUT, `${name}.png`) });
  console.log('wrote', `${name}.png`);
  await context.close();
}

await browser.close();
