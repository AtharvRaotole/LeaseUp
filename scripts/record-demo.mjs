#!/usr/bin/env node
/**
 * Record a reproducible LeaseUp product demo (demo fixtures only).
 * Prereq: preview + worker (see scripts/run-record-demo.mjs).
 */
import { chromium } from 'playwright';
import { mkdir, rm, copyFile, writeFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = process.env.RECORD_DEMO_BASE || 'http://127.0.0.1:4179';
const OUT_DIR = join(process.cwd(), 'apps/web/public/demo');
const DOCS_DIR = join(process.cwd(), 'docs');
const ADDRESS = '1574 N Milwaukee Ave, Chicago';
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

async function humanMove(page, x, y, steps = 32) {
  await page.mouse.move(x, y, { steps });
  await page.evaluate(
    ([mx, my]) => {
      window.__leaseupDemoCursor?.(mx, my);
    },
    [x, y]
  );
}

async function humanClick(page, x, y) {
  await humanMove(page, x, y);
  await pause(180);
  await page.mouse.click(x, y);
  await pause(220);
}

async function encodeVideo(rawPath, mp4Out, webmOut) {
  const tryEncode = (crfMp4, crfWebm) => {
    execSync(
      `ffmpeg -y -i "${rawPath}" -an -vf "scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf ${crfMp4} -preset slow "${mp4Out}"`,
      { stdio: 'inherit' }
    );
    execSync(
      `ffmpeg -y -i "${rawPath}" -an -vf "scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2" -c:v libvpx-vp9 -crf ${crfWebm} -b:v 0 -row-mt 1 "${webmOut}"`,
      { stdio: 'inherit' }
    );
  };
  tryEncode(30, 38);
  const maxBytes = 4 * 1024 * 1024;
  for (const crf of [32, 34, 36]) {
    const mp4Stat = await stat(mp4Out);
    const webmStat = await stat(webmOut);
    if (mp4Stat.size <= maxBytes && webmStat.size <= maxBytes) break;
    tryEncode(crf, crf + 6);
  }
}

async function writePosterFromVideo(mp4Path, posterPath) {
  execSync(
    `ffmpeg -y -i "${mp4Path}" -ss 12 -vframes 1 -q:v 2 -vf "scale=1440:900" "${posterPath}"`,
    { stdio: 'inherit' }
  );
}

await mkdir(OUT_DIR, { recursive: true });
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
await pause(900);
await humanMove(page, 720, 280);
await pause(400);

const input = page.getByPlaceholder(/Storefront address/i);
await input.click();
await pause(200);
for (const ch of ADDRESS) {
  await page.keyboard.type(ch, { delay: 42 });
}
await pause(500);
await page.getByRole('button', { name: 'Analyze' }).click();
await pause(800);

const geocode = page.getByTestId('geocode-confirm');
if (await geocode.isVisible().catch(() => false)) {
  await humanMove(page, 720, 520);
  await pause(600);
  await page.getByRole('button', { name: 'Use this pin' }).click();
  await pause(700);
}

await page.getByTestId('brands-to-pitch').waitFor({ timeout: 120000 });
await pause(1200);

const mapCanvas = page.locator('.maplibregl-canvas').first();
await mapCanvas.waitFor({ state: 'visible', timeout: 60000 });
const mapBox = await mapCanvas.boundingBox();
if (mapBox) {
  const spots = [
    [mapBox.x + mapBox.width * 0.35, mapBox.y + mapBox.height * 0.42],
    [mapBox.x + mapBox.width * 0.55, mapBox.y + mapBox.height * 0.38],
    [mapBox.x + mapBox.width * 0.48, mapBox.y + mapBox.height * 0.52],
  ];
  for (const [sx, sy] of spots) {
    await humanMove(page, sx, sy, 40);
    await pause(700);
  }
}

await page.locator('[data-testid="why-this-brand"]:visible').waitFor({ timeout: 30000 });
await humanMove(page, 1050, 420);
await pause(800);

await page.getByRole('button', { name: 'Chain size' }).click();
await pause(1100);
await page.getByRole('button', { name: 'Local taste' }).click();
await pause(1100);

await page.mouse.wheel(0, 520);
await pause(600);
const pipelineBtn = page.locator('[data-testid="add-to-pipeline"]:visible').first();
await pipelineBtn.waitFor({ state: 'visible', timeout: 30000 });
const pipeBox = await pipelineBtn.boundingBox();
if (pipeBox) await humanMove(page, pipeBox.x + pipeBox.width / 2, pipeBox.y + pipeBox.height / 2);
await pipelineBtn.click();
await page.getByText('Added to pipeline').waitFor({ timeout: 30000 });
await pause(900);

await page.getByTestId('share-pitch').click();
await pause(500);
await page.getByRole('button', { name: 'Create public link' }).click();
await page.getByRole('button', { name: 'Open pitch' }).waitFor({ timeout: 60000 });
const [pitchPage] = await Promise.all([
  context.waitForEvent('page'),
  page.getByRole('button', { name: 'Open pitch' }).click(),
]);
await pitchPage.getByTestId('pitch-page').waitFor({ timeout: 60000 });
await pause(1600);
await humanMove(pitchPage, 720, 400);
await pause(1200);

const video = page.video();
await context.close();
await browser.close();

const rawVideo = await video.path();
const mp4Out = join(OUT_DIR, 'demo.mp4');
const webmOut = join(OUT_DIR, 'demo.webm');
const posterOut = join(OUT_DIR, 'poster.jpg');

await encodeVideo(rawVideo, mp4Out, webmOut);
await writePosterFromVideo(mp4Out, posterOut);

const mapPoster = join(OUT_DIR, 'map-poster.jpg');
execSync(
  `ffmpeg -y -i "${mp4Out}" -ss 14 -vframes 1 -q:v 2 -vf "crop=720:480:720:80" "${mapPoster}"`,
  { stdio: 'inherit' }
);

const mp4Stat = await stat(mp4Out);
const webmStat = await stat(webmOut);
const meta = {
  recordedAt: new Date().toISOString(),
  commitSha: gitSha(),
  baseUrl: BASE,
  addressTyped: ADDRESS,
  mp4Bytes: mp4Stat.size,
  webmBytes: webmStat.size,
};
await writeFile(join(DOCS_DIR, 'demo-recording.json'), JSON.stringify(meta, null, 2));
await copyFile(mp4Out, join(DOCS_DIR, 'demo.mp4'));
await copyFile(webmOut, join(DOCS_DIR, 'demo.webm'));
await copyFile(posterOut, join(DOCS_DIR, 'poster.jpg'));

console.log('Demo assets written', meta);
await rm(videoDir, { recursive: true, force: true });
