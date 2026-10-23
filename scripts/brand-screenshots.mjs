/**
 * Brand QA screenshots for PR artifacts.
 * Prereq: pnpm --filter @leaseup/web build && pnpm --filter @leaseup/web preview (port 4173)
 */
import { chromium } from 'playwright';
import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const ARTIFACTS = '/opt/cursor/artifacts';
const OUT = join(process.cwd(), 'docs/brand/generated/screenshots');

await mkdir(OUT, { recursive: true });
await mkdir(ARTIFACTS, { recursive: true });

const browser = await chromium.launch();

async function shot(page, name) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: false });
  await copyFile(path, join(ARTIFACTS, name));
  console.log('saved', path);
}

for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: scheme,
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shot(page, `landing-${scheme}-1440.png`);
  await page.close();
}

for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: scheme,
  });
  const demo =
    `${BASE}/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1`;
  await page.goto(demo, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('LeaseUp home').waitFor({ timeout: 30000 });
  await page
    .locator('[data-testid="brands-to-pitch"]')
    .or(page.getByText('Running analysis'))
    .first()
    .waitFor({ timeout: 45000 })
    .catch(() => undefined);
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: join(OUT, `report-header-${scheme}-1440.png`),
    clip: { x: 0, y: 0, width: 1440, height: 200 },
  });
  await copyFile(
    join(OUT, `report-header-${scheme}-1440.png`),
    join(ARTIFACTS, `report-header-${scheme}-1440.png`)
  );
  console.log('saved', join(OUT, `report-header-${scheme}-1440.png`));
  await page.close();
}

const favPage = await browser.newPage({ viewport: { width: 720, height: 120 } });
await favPage.goto(BASE, { waitUntil: 'networkidle' });
await favPage.setContent(`
<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #e8e6e1; padding: 24px; font-family: system-ui, sans-serif; }
  .tab {
    display: inline-flex; align-items: center; gap: 10px;
    max-width: 280px; padding: 10px 16px;
    background: #fafaf7; border-radius: 10px 10px 0 0;
    border: 1px solid #d6d3cb; border-bottom: none;
    box-shadow: 0 -2px 8px rgba(0,0,0,.06);
    font-size: 13px; color: #121212;
  }
  .tab img { width: 18px; height: 18px; }
</style></head><body>
  <div class="tab">
    <img src="${BASE}/favicon.svg" width="18" height="18" alt="" />
    <span>LeaseUp · Tenant prospecting</span>
  </div>
</body></html>`);
await favPage.waitForTimeout(300);
await favPage.screenshot({ path: join(OUT, 'favicon-browser-tab.png') });
await copyFile(join(OUT, 'favicon-browser-tab.png'), join(ARTIFACTS, 'favicon-browser-tab.png'));

await copyFile(
  join(process.cwd(), 'docs/brand/generated/contact-sheet.png'),
  join(ARTIFACTS, 'contact-sheet.png')
);
await copyFile(join(process.cwd(), 'apps/web/public/og.png'), join(ARTIFACTS, 'og.png'));

await browser.close();
console.log('Brand screenshots complete');
