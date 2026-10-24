#!/usr/bin/env node
/**
 * Record a LeaseUp product walkthrough with Playwright video.
 *
 * Local stack only by default (avoids production KV writes).
 *
 *   pnpm record:demo:local
 *   RECORD_DEMO_TEST=1 pnpm record:demo:local
 *   MEDIA_CAPTURE_ALLOW_PROD=1 RECORD_DEMO_BASE=https://... pnpm record:demo:script  # after KV reset only
 *   RECORD_DEMO_HERO=1 pnpm record:demo              # also build hero loop in docs/media
 *   RECORD_DEMO_HERO_ONLY=1 RECORD_DEMO_HERO=1 ...   # hero loop only (no walkthrough)
 *   RECORD_DEMO_PUBLISH_HERO=1                       # copy hero assets to apps/web/public/media
 */
import { chromium } from 'playwright';
import { mkdir, rm, copyFile, writeFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertLocalMediaCapture, assertOwnerAuthorizedRecording } from './media-capture-guard.mjs';

assertOwnerAuthorizedRecording();

const BASE = (process.env.RECORD_DEMO_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const WORKER_ORIGIN = (process.env.RECORD_DEMO_API || 'http://127.0.0.1:8787').replace(/\/$/, '');
assertLocalMediaCapture(BASE, WORKER_ORIGIN);
const IS_TEST = process.env.RECORD_DEMO_TEST === '1';
const BUILD_HERO = process.env.RECORD_DEMO_HERO === '1';
const HERO_ONLY = process.env.RECORD_DEMO_HERO_ONLY === '1';
const PUBLISH_HERO = process.env.RECORD_DEMO_PUBLISH_HERO === '1';
const MEDIA_DIR = join(process.cwd(), 'docs/media');
const PUBLIC_MEDIA = join(process.cwd(), 'apps/web/public/media');
const ADDRESS =
  process.env.RECORD_DEMO_ADDRESS || '1560 N Milwaukee Ave, Chicago, IL 60622';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function launchDemoBrowser() {
  return chromium.launch({
    headless: true,
    args: ['--disable-features=ThirdPartyCookiePhaseout'],
  });
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function installDemoChrome(page) {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = `
      input, textarea { caret-color: #0f6b4f !important; }
      #leaseup-demo-cursor {
        position: fixed; left: 0; top: 0; width: 28px; height: 28px;
        margin-left: -8px; margin-top: -8px; border-radius: 50%;
        border: 3px solid #fff; background: rgba(15, 107, 79, 0.95);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25);
        z-index: 2147483647; pointer-events: none;
        transform: translate(-9999px, -9999px);
      }
    `;
    document.documentElement.appendChild(style);
    const el = document.createElement('div');
    el.id = 'leaseup-demo-cursor';
    document.documentElement.appendChild(el);
    const move = (x, y) => {
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.__leaseupDemoCursor = move;
    document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY), true);
  });
}

async function humanMove(page, x, y, steps = 40) {
  await page.mouse.move(x, y, { steps });
  await page.evaluate(
    ([mx, my]) => {
      window.__leaseupDemoCursor?.(mx, my);
    },
    [x, y]
  );
}

async function smoothScrollBy(page, deltaY, durationMs = 900) {
  await page.evaluate(
    async ({ deltaY, durationMs }) => {
      const start = window.scrollY;
      const target = Math.max(0, start + deltaY);
      const t0 = performance.now();
      await new Promise((resolve) => {
        const frame = (now) => {
          const t = Math.min(1, (now - t0) / durationMs);
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          window.scrollTo(0, start + (target - start) * ease);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    },
    { deltaY, durationMs }
  );
}

async function setPageZoom(page, factor) {
  await page.evaluate((f) => {
    document.documentElement.style.zoom = String(f);
  }, factor);
}

async function focusZoomSegment(page, selector, factor = 1.4, holdMs = 2800) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await pause(400);
  await setPageZoom(page, factor);
  await pause(holdMs);
  await setPageZoom(page, 1);
  await pause(400);
}

async function closeShareDialog(page) {
  const close = page
    .locator('[aria-labelledby="share-pitch-title"]')
    .getByRole('button', { name: 'Close' });
  if (await close.isVisible().catch(() => false)) {
    await close.click({ force: true });
    await pause(400);
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

async function encodeHeroLoopFromRaw(rawPath, mp4Out, webmOut) {
  const vf =
    'scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2';
  execSync(
    `ffmpeg -y -i "${rawPath}" -an -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 28 -preset slow "${mp4Out}"`,
    { stdio: 'inherit' }
  );
  execSync(
    `ffmpeg -y -i "${mp4Out}" -an -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 "${webmOut}"`,
    { stdio: 'inherit' }
  );
}

function extractPoster(mp4Path, posterPath, atSeconds = 3) {
  execSync(
    `ffmpeg -y -i "${mp4Path}" -ss ${atSeconds} -vframes 1 -update 1 -q:v 2 -vf "scale=1440:900" "${posterPath}"`,
    { stdio: 'inherit' }
  );
}

async function expectAddedPipeline(page) {
  await page
    .getByRole('button', { name: 'Added to pipeline' })
    .or(page.getByText('Added to pipeline'))
    .first()
    .waitFor({ timeout: 60000 });
}

async function recordHeroTypingLoop(outDir) {
  const videoDir = join(tmpdir(), `leaseup-hero-${Date.now()}`);
  await mkdir(videoDir, { recursive: true });
  const browser = await launchDemoBrowser();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
    colorScheme: 'light',
  });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(BASE).origin,
  });
  const p = await ctx.newPage();
  await installDemoChrome(p);
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pause(1200);
  const input = p.getByPlaceholder(/Storefront address/i);
  const inputBox = await input.boundingBox();
  if (inputBox) {
    await humanMove(p, inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, 36);
  }
  await input.click();
  await pause(500);
  for (const ch of ADDRESS) {
    await p.keyboard.type(ch, { delay: 72 });
  }
  await setPageZoom(p, 1.12);
  await pause(2400);
  await setPageZoom(p, 1);
  await pause(300);
  for (let i = 0; i < ADDRESS.length; i++) {
    await p.keyboard.press('Backspace');
    await pause(48);
  }
  await pause(2000);
  const video = p.video();
  await ctx.close();
  await browser.close();
  const raw = await video.path();
  const heroMp4 = join(outDir, 'hero-loop.mp4');
  const heroWebm = join(outDir, 'hero-loop.webm');
  await encodeHeroLoopFromRaw(raw, heroMp4, heroWebm);
  extractPoster(heroMp4, join(outDir, 'hero-poster.jpg'), 2);
  await rm(videoDir, { recursive: true, force: true });
}

async function publishHeroAssets() {
  if (!PUBLISH_HERO) return;
  await mkdir(PUBLIC_MEDIA, { recursive: true });
  for (const name of ['hero-loop.mp4', 'hero-loop.webm', 'hero-poster.jpg']) {
    await copyFile(join(MEDIA_DIR, name), join(PUBLIC_MEDIA, name));
  }
}

await mkdir(MEDIA_DIR, { recursive: true });

if (HERO_ONLY) {
  if (!BUILD_HERO) {
    console.error('RECORD_DEMO_HERO_ONLY requires RECORD_DEMO_HERO=1');
    process.exit(1);
  }
  await recordHeroTypingLoop(MEDIA_DIR);
  await publishHeroAssets();
  const heroStat = await stat(join(MEDIA_DIR, 'hero-loop.mp4'));
  console.log('Hero loop written', { bytes: heroStat.size, baseUrl: BASE });
  process.exit(0);
}

const videoDir = join(tmpdir(), `leaseup-demo-${Date.now()}`);
await mkdir(videoDir, { recursive: true });

const browser = await launchDemoBrowser();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  colorScheme: 'light',
});
await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
  origin: new URL(BASE).origin,
});

const page = await context.newPage();
await installDemoChrome(page);

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await pause(2500);
await humanMove(page, 720, 300);

const input = page.getByPlaceholder(/Storefront address/i);
await input.click();
await pause(400);
for (const ch of ADDRESS) {
  await page.keyboard.type(ch, { delay: 58 });
}
await pause(1200);
await page.getByRole('button', { name: 'Analyze' }).click();
await pause(1500);

if (await page.getByTestId('geocode-confirm').isVisible().catch(() => false)) {
  await humanMove(page, 720, 520);
  await pause(1000);
  await page.getByRole('button', { name: 'Use this pin' }).click();
  await pause(1000);
}

await page.getByTestId('brands-to-pitch').waitFor({ timeout: 180000 });
await dismissReportChrome(page);
await pause(2500);

const mapCanvas = page.locator('.maplibregl-canvas').first();
await mapCanvas.waitFor({ state: 'visible', timeout: 90000 });
const mapBox = await mapCanvas.boundingBox();
if (mapBox) {
  for (const [sx, sy] of [
    [mapBox.x + mapBox.width * 0.4, mapBox.y + mapBox.height * 0.45],
    [mapBox.x + mapBox.width * 0.58, mapBox.y + mapBox.height * 0.4],
  ]) {
    await humanMove(page, sx, sy, 48);
    await pause(2000);
  }
}

await focusZoomSegment(page, '[data-testid="why-this-brand"]:visible', 1.45, 3200);

await page.getByTestId('brands-to-pitch').hover();
await pause(1000);
await smoothScrollBy(page, 280, 1000);
await pause(1200);

const chainSize = page.getByRole('button', { name: 'Chain size' });
if (await chainSize.isVisible().catch(() => false)) {
  await chainSize.click();
  await pause(1600);
  await page.getByRole('button', { name: 'Local taste' }).click();
  await pause(1600);
}

await focusZoomSegment(page, 'text=Same brands, different places', 1.4, 3000);

await page.getByTestId('share-pitch').click();
await pause(800);
await page.getByRole('button', { name: 'Create public link' }).click();
const shareLinkField = page
  .getByTestId('share-pitch-link')
  .or(page.locator('input[readonly][value*="/pitch/"]'));
await shareLinkField.waitFor({ timeout: 120000 });
const denied = await page.getByText(/Write permission denied/i).count();
if (denied > 0) {
  throw new Error('Share step surfaced clipboard error; fix UI or grant permissions.');
}
await pause(1500);
const pitchUrl = await shareLinkField.inputValue();
if (!pitchUrl.includes('/pitch/')) {
  throw new Error('Share step did not produce a pitch URL');
}
const [pitchPage] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate((url) => window.open(url, '_blank', 'noopener'), pitchUrl),
]);
await pitchPage.getByTestId('pitch-page').waitFor({ timeout: 90000 });
await pause(2500);
await humanMove(pitchPage, 720, 380);
await pause(2000);
await pitchPage.close();
await pause(500);

await page.bringToFront();
await closeShareDialog(page);
await dismissReportChrome(page);

const pipelineBtn = page.locator('[data-testid="add-to-pipeline"]:visible').first();
await pipelineBtn.scrollIntoViewIfNeeded();
await pause(500);
const pipeBox = await pipelineBtn.boundingBox();
if (pipeBox) {
  await humanMove(page, pipeBox.x + pipeBox.width / 2, pipeBox.y + pipeBox.height / 2, 44);
}
const pipelineSave = page.waitForResponse(
  (r) =>
    r.url().includes('/api/pipeline/cards') &&
    r.request().method() === 'POST' &&
    r.status() >= 200 &&
    r.status() < 300,
  { timeout: 90000 }
);
await pipelineBtn.click();
const saveRes = await pipelineSave;
const savedBoard = await saveRes.json();
if (!savedBoard.cards?.length) {
  throw new Error('Pipeline POST returned no cards');
}
const workerHost = new URL(WORKER_ORIGIN).hostname;
await context.addCookies([
  {
    name: 'leaseup_pipeline_ws',
    value: savedBoard.workspaceId,
    domain: workerHost,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  },
]);
await expectAddedPipeline(page);
await pause(2000);

await page.goto(`${BASE}/pipeline`, { waitUntil: 'domcontentloaded' });
await page.waitForResponse(
  (r) => r.url().includes('/api/pipeline') && r.request().method() === 'GET' && r.ok(),
  { timeout: 90000 }
);
const pipelineBoard = page.getByTestId('pipeline-board');
const pipelineEmpty = page.getByTestId('pipeline-empty');
await pipelineBoard.or(pipelineEmpty).first().waitFor({ timeout: 90000 });
if (await pipelineEmpty.isVisible().catch(() => false)) {
  throw new Error('Pipeline board is empty after add; check worker cookies on prod.');
}
await page.getByTestId('pipeline-card').first().waitFor({ timeout: 60000 });
await pause(3000);
await humanMove(page, 720, 420);
await pause(2500);

const video = page.video();
await context.close();
await browser.close();

const rawVideo = await video.path();
const prefix = IS_TEST ? 'test-capture' : 'walkthrough';
const walkMp4 = join(MEDIA_DIR, `${prefix}.mp4`);
const walkWebm = join(MEDIA_DIR, `${prefix}.webm`);
const walkPoster = join(MEDIA_DIR, `${prefix}-poster.jpg`);

const maxBytes = 10 * 1024 * 1024;
await encodeWalkthrough(rawVideo, walkMp4, walkWebm, maxBytes);
extractPoster(walkMp4, walkPoster, 5);

if (BUILD_HERO) {
  await recordHeroTypingLoop(MEDIA_DIR);
  await publishHeroAssets();
}

const mp4Stat = await stat(walkMp4);
const webmStat = await stat(walkWebm);
const meta = {
  recordedAt: new Date().toISOString(),
  commitSha: gitSha(),
  baseUrl: BASE,
  addressTyped: ADDRESS,
  testCapture: IS_TEST,
  walkthroughMp4Bytes: mp4Stat.size,
  walkthroughWebmBytes: webmStat.size,
  heroBuilt: BUILD_HERO,
  note: 'Judge-facing re-record waits for summary-first report redesign on prod.',
};
await writeFile(join(MEDIA_DIR, IS_TEST ? 'test-capture.json' : 'recording.json'), JSON.stringify(meta, null, 2));

console.log('Media written', meta);
await rm(videoDir, { recursive: true, force: true });
