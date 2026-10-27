#!/usr/bin/env node
/**
 * Devpost gallery and README stills at 3:2 (2880x1920: a 1440x960 viewport at 2x), from production.
 * GET pages only: demo chip reports are recordings and the prospecting page reads a finished job,
 * so this spends no live Qloo quota. Usage:
 *   PROSPECT_JOB=<finished live job id> node scripts/capture-devpost-gallery-3x2.mjs
 */
import { chromium } from 'playwright';
const B = process.env.GALLERY_BASE_URL || 'https://leaseup-59m.pages.dev';
const OUT = process.env.GALLERY_OUT || 'docs/devpost/gallery';
const enc = encodeURIComponent;
const WICKER = `/r/wicker?address=${enc('1560 N Milwaukee Ave, Chicago, IL 60622')}&radius=10`;
const BOULDER = `/r/boulder?address=${enc('1300 Pearl St, Boulder, CO 80302')}&radius=10`;
const SEVIER = `/r/sevierville?address=${enc('125 Collier Dr, Sevierville, TN 37862')}&radius=10`;
const PROSPECT = `/prospect/${process.env.PROSPECT_JOB || '5ea1265e-e01e-46aa-ac91-79511f31cebb'}`;
const PITCH = '/p/7255de71-5f7b-4ffe-8eed-08075d80ce22';
const browser = await chromium.launch();
const errs = [];
async function shot(name, path, prep, { w = 1440, h = 960 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push(name + ': ' + m.text().slice(0, 150)); });
  page.on('response', (r) => { if (r.url().includes('/api/analyze')) errs.push(name + ': ANALYZE HIT'); });
  await page.goto(B + path, { waitUntil: 'networkidle', timeout: 60000 });
  if (prep) await prep(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
}
const map = async (p) => { await p.waitForSelector('.maplibregl-canvas', { timeout: 45000 }); await p.waitForTimeout(2500); };
await shot('01-report-wicker', WICKER, map);
await shot('02-agent-review-bedford', PROSPECT, async (p) => {
  await p.getByTestId('agent-receipt-planner').waitFor({ timeout: 90000 });
  const c = p.getByTestId('review-decision-callout');
  await c.scrollIntoViewIfNeeded();
  await p.evaluate(() => { const el = document.querySelector('[data-testid="review-decision-callout"]'); window.scrollBy(0, el.getBoundingClientRect().top - 90); });
});
await shot('03-agent-receipt-bedford', PROSPECT, async (p) => {
  await p.getByTestId('agent-receipt-planner').waitFor({ timeout: 90000 });
  await p.evaluate(() => { const el = document.querySelector('[data-testid="agent-receipt-planner"]'); window.scrollBy(0, el.getBoundingClientRect().top - 90); });
});
await shot('04-report-boulder', BOULDER, map);
await shot('05-pitch-brief', PITCH, null);
await shot('06-report-sevierville', SEVIER, map);
await shot('07-landing', '/', null);
await shot('08-brand-sites', '/brand', async (p) => { await p.waitForTimeout(3000); });
await shot('09-methodology', '/methodology', null);
await shot('10-portfolio', '/portfolio', null);
await shot('11-pipeline', '/pipeline', null);
// Phone: report and map side by side on a 3:2 canvas.
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto(B + WICKER, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/_phone-report.png` });
const t = page.getByRole('tab', { name: 'Map' }).or(page.getByRole('button', { name: 'Map', exact: true })).first();
await t.click();
await page.waitForSelector('.maplibregl-canvas', { timeout: 45000 }); await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/_phone-map.png` });
await ctx.close();
const fs = await import('node:fs');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(`${OUT}/${f}`).toString('base64');
const c2 = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
const p2 = await c2.newPage();
await p2.setContent(`<html><body style="margin:0;width:1440px;height:960px;background:#0b0f14;display:flex;align-items:center;justify-content:center;gap:72px;font-family:system-ui">
<img src="${b64('_phone-report.png')}" style="height:844px;border-radius:28px;border:1px solid #2a3340"/>
<img src="${b64('_phone-map.png')}" style="height:844px;border-radius:28px;border:1px solid #2a3340"/></body></html>`);
await p2.waitForTimeout(500);
await p2.screenshot({ path: `${OUT}/12-mobile-wicker.png` });
fs.rmSync(`${OUT}/_phone-report.png`);
fs.rmSync(`${OUT}/_phone-map.png`);
await browser.close();
console.log(JSON.stringify({ errs }));
