/**
 * Landing story screenshots for README and PR artifacts.
 * Prereq: pnpm --filter @leaseup/web build && pnpm --filter @leaseup/web preview (4173)
 */
import { chromium } from 'playwright';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:4173';
const ARTIFACTS = '/opt/cursor/artifacts';
const OUT = join(process.cwd(), 'docs/screenshots');

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function mergeBaseSha() {
  try {
    return execSync('git rev-parse origin/cursor/leaseup-v1-c429', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

await mkdir(OUT, { recursive: true });
await mkdir(ARTIFACTS, { recursive: true });

const meta = {
  capturedAt: new Date().toISOString(),
  commitSha: gitSha(),
  baseBranchSha: mergeBaseSha(),
};
await writeFile(join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));

const browser = await chromium.launch();

async function fullPageShot(page, name) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: true });
  await copyFile(path, join(ARTIFACTS, name));
  console.log('saved', path);
}

for (const scheme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 390 ? 844 : 900 },
      colorScheme: scheme,
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await fullPageShot(page, `landing-${scheme}-${width}.png`);
    await page.close();
  }
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
  await page.waitForTimeout(2000);
  const path = join(OUT, `report-${scheme}-1440.png`);
  await page.screenshot({ path, fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 720 } });
  await copyFile(path, join(ARTIFACTS, `report-${scheme}-1440.png`));
  console.log('saved', path);
  await page.close();
}

for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: scheme,
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('landing-report-preview').waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  const previewPath = join(OUT, `landing-preview-${scheme}-1440.png`);
  const clip = await page.getByTestId('landing-report-preview').boundingBox();
  if (clip) {
    await page.screenshot({ path: previewPath, clip });
    await copyFile(previewPath, join(ARTIFACTS, `landing-preview-${scheme}-1440.png`));
    console.log('saved', previewPath);
  }
  await page.close();
}

await browser.close();
console.log('Story screenshots complete', meta);
