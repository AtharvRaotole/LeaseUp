#!/usr/bin/env node
/**
 * Record a LeaseUp product walkthrough with Playwright video.
 * Default: read-only against production Pages (demo fixtures on the worker).
 *
 *   node scripts/record-demo.mjs
 *   RECORD_DEMO_BASE=https://leaseup-59m.pages.dev node scripts/record-demo.mjs
 */
import { chromium } from 'playwright';
import { mkdir, rm, copyFile, writeFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = (process.env.RECORD_DEMO_BASE || 'https://leaseup-59m.pages.dev').replace(/\/$/, '');
const MEDIA_DIR = join(process.cwd(), 'docs/media');
const PUBLIC_MEDIA = join(process.cwd(), 'apps/web/public/media');
const ADDRESS = process.env.RECORD_DEMO_ADDRESS || '1560 N Milwaukee Ave Chicago';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function installCursor(page) {
  await page.addInitScript(() => {
    const el = document.createElement('div');
    el.id = 'leaseup-demo-cursor';
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '20px',
      height: '20px',
      marginLeft: '-6px',
      marginTop: '-6px',
      borderRadius: '50%',
      border: '2px solid #ffffff',
      background: 'rgba(15, 107, 79, 0.9)',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transform: 'translate(-9999px, -9999px)',
      transition: 'transform 55ms linear',
    });
    document.documentElement.appendChild(el);
    window.__leaseupDemoCursor = (x, y) => {
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
  });
}

async function humanMove(page, x, y, steps = 36) {
  await page.mouse.move(x, y, { steps });
  await page.evaluate(
    ([mx, my]) => {
      window.__leaseupDemoCursor?.(mx, my);
    },
    [x, y]
  );
}

async function closeShareDialog(page) {
  const close = page
    .locator('[aria-labelledby="share-pitch-title"]')
    .getByRole('button', { name: 'Close' });
  if (await close.isVisible().catch(() => false)) {
    await close.click({ force: true });
    await pause(500);
    await page.locator('[aria-labelledby="share-pitch-title"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
  }
}

async function dismissReportChrome(page) {
  const tourDismiss = page.getByTestId('report-tour-dismiss');
  if (await tourDismiss.isVisible().catch(() => false)) {
    await tourDismiss.click();
    await pause(400);
  }
  const demoDismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await demoDismiss.isVisible().catch(() => false)) {
    await demoDismiss.click();
    await pause(300);
  }
}

async function encodeWalkthrough(rawPath, mp4Out, webmOut, maxBytes) {
  const scale =
    'scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2';
  const tryEncode = (crfMp4, crfWebm) => {
    execSync(
      `ffmpeg -y -i "${rawPath}" -an -vf "${scale}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf ${crfMp4} -preset slow "${mp4Out}"`,
      { stdio: 'inherit' }
    );
    execSync(
      `ffmpeg -y -i "${rawPath}" -an -vf "${scale}" -c:v libvpx-vp9 -crf ${crfWebm} -b:v 0 -row-mt 1 "${webmOut}"`,
      { stdio: 'inherit' }
    );
  };
  tryEncode(28, 36);
  for (const crf of [30, 32, 34, 36]) {
    const mp4Stat = await stat(mp4Out);
    const webmStat = await stat(webmOut);
    if (mp4Stat.size <= maxBytes && webmStat.size <= maxBytes) break;
    tryEncode(crf, crf + 8);
  }
}

async function encodeHeroLoop(mp4Source, mp4Out, webmOut, seconds = 5) {
  const vf = `scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2`;
  execSync(
    `ffmpeg -y -i "${mp4Source}" -t ${seconds} -an -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 30 -preset slow "${mp4Out}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `ffmpeg -y -i "${mp4Source}" -t ${seconds} -an -vf "${vf}" -c:v libvpx-vp9 -crf 40 -b:v 0 -row-mt 1 "${webmOut}"`,
    { stdio: 'inherit' }
  );
}

function extractPoster(mp4Path, posterPath, atSeconds = 3) {
  execSync(
    `ffmpeg -y -i "${mp4Path}" -ss ${atSeconds} -vframes 1 -update 1 -q:v 2 -vf "scale=1440:900" "${posterPath}"`,
    { stdio: 'inherit' }
  );
}

await mkdir(MEDIA_DIR, { recursive: true });
await mkdir(PUBLIC_MEDIA, { recursive: true });

const videoDir = join(tmpdir(), `leaseup-demo-${Date.now()}`);
await mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  colorScheme: 'light',
});
const page = await context.newPage();
await installCursor(page);

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await pause(2200);
await humanMove(page, 720, 300);

const input = page.getByPlaceholder(/Storefront address/i);
await input.click();
await pause(350);
for (const ch of ADDRESS) {
  await page.keyboard.type(ch, { delay: 55 });
}
await pause(1100);
await page.getByRole('button', { name: 'Analyze' }).click();
await pause(1400);

if (await page.getByTestId('geocode-confirm').isVisible().catch(() => false)) {
  await humanMove(page, 720, 520);
  await pause(900);
  await page.getByRole('button', { name: 'Use this pin' }).click();
  await pause(900);
}

await page.getByTestId('brands-to-pitch').waitFor({ timeout: 180000 });
await dismissReportChrome(page);
await pause(2200);

const mapCanvas = page.locator('.maplibregl-canvas').first();
await mapCanvas.waitFor({ state: 'visible', timeout: 90000 });
const mapBox = await mapCanvas.boundingBox();
if (mapBox) {
  const spots = [
    [mapBox.x + mapBox.width * 0.4, mapBox.y + mapBox.height * 0.45],
    [mapBox.x + mapBox.width * 0.58, mapBox.y + mapBox.height * 0.4],
    [mapBox.x + mapBox.width * 0.5, mapBox.y + mapBox.height * 0.55],
  ];
  for (const [sx, sy] of spots) {
    await humanMove(page, sx, sy, 44);
    await pause(1800);
  }
}

await page.locator('[data-testid="why-this-brand"]:visible').waitFor({ timeout: 60000 });
await humanMove(page, 680, 520);
await pause(2000);

await page.getByTestId('brands-to-pitch').hover();
await pause(1200);
await page.mouse.wheel(0, 220);
await pause(900);
await humanMove(page, 520, 480);
await pause(1800);

const chainSize = page.getByRole('button', { name: 'Chain size' });
if (await chainSize.isVisible().catch(() => false)) {
  await chainSize.click();
  await pause(1400);
  await page.getByRole('button', { name: 'Local taste' }).click();
  await pause(1400);
}

await page.getByTestId('share-pitch').click();
await pause(700);
await page.getByRole('button', { name: 'Create public link' }).click();
const pitchLink = page.locator('a[href*="/pitch/"]').first();
await pitchLink.waitFor({ timeout: 90000 });
const pitchHref = await pitchLink.getAttribute('href');
const pitchUrl = pitchHref?.startsWith('http') ? pitchHref : `${BASE}${pitchHref}`;
const [pitchPage] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((url) => window.open(url, '_blank', 'noopener'), pitchUrl),
]);
await pitchPage.getByTestId('pitch-page').waitFor({ timeout: 90000 });
await pause(2800);
await humanMove(pitchPage, 720, 380);
await pause(2200);
await pitchPage.mouse.wheel(0, 320);
await pause(1800);
await pitchPage.close();
await pause(600);

await page.bringToFront();
await closeShareDialog(page);
await dismissReportChrome(page);
await page.mouse.wheel(0, 480);
await pause(700);
const pipelineBtn = page.locator('[data-testid="add-to-pipeline"]:visible').first();
await pipelineBtn.waitFor({ state: 'visible', timeout: 60000 });
await pipelineBtn.scrollIntoViewIfNeeded();
await pause(600);
const pipeBox = await pipelineBtn.boundingBox();
if (pipeBox) {
  await humanMove(page, pipeBox.x + pipeBox.width / 2, pipeBox.y + pipeBox.height / 2, 40);
}
await pipelineBtn.click({ force: true });
await page.getByText('Added to pipeline').waitFor({ timeout: 60000 });
await pause(3200);
await humanMove(page, 720, 450);
await pause(2800);

const video = page.video();
await context.close();
await browser.close();

const rawVideo = await video.path();
const walkMp4 = join(MEDIA_DIR, 'walkthrough.mp4');
const walkWebm = join(MEDIA_DIR, 'walkthrough.webm');
const walkPoster = join(MEDIA_DIR, 'walkthrough-poster.jpg');
const heroMp4 = join(MEDIA_DIR, 'hero-loop.mp4');
const heroWebm = join(MEDIA_DIR, 'hero-loop.webm');
const heroPoster = join(MEDIA_DIR, 'hero-poster.jpg');

const maxBytes = 10 * 1024 * 1024;
await encodeWalkthrough(rawVideo, walkMp4, walkWebm, maxBytes);
extractPoster(walkMp4, walkPoster, 4);
await encodeHeroLoop(walkMp4, heroMp4, heroWebm, 5);
extractPoster(heroMp4, heroPoster, 1);

for (const name of ['hero-loop.mp4', 'hero-loop.webm', 'hero-poster.jpg']) {
  await copyFile(join(MEDIA_DIR, name), join(PUBLIC_MEDIA, name));
}

const mp4Stat = await stat(walkMp4);
const webmStat = await stat(walkWebm);
const heroMp4Stat = await stat(heroMp4);
const meta = {
  recordedAt: new Date().toISOString(),
  commitSha: gitSha(),
  baseUrl: BASE,
  addressTyped: ADDRESS,
  walkthroughMp4Bytes: mp4Stat.size,
  walkthroughWebmBytes: webmStat.size,
  heroLoopMp4Bytes: heroMp4Stat.size,
};
await writeFile(join(MEDIA_DIR, 'recording.json'), JSON.stringify(meta, null, 2));

console.log('Media written to docs/media/', meta);
await rm(videoDir, { recursive: true, force: true });
