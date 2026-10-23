import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';
const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const API_ORIGIN = (process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const WORKER_ORIGIN = 'https://leaseup-worker.issue-atharva.workers.dev';

test.describe('Production CSP on report + map', () => {
  test('report loads API and MapLibre under committed _headers CSP', async ({ page }) => {
    test.setTimeout(240_000);
    const csp = readFileSync(join(process.cwd(), 'apps/web/public/_headers'), 'utf8');
    const cspLine = csp
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('Content-Security-Policy:'));
    expect(cspLine, 'apps/web/public/_headers must define CSP').toBeTruthy();
    const policy = cspLine!.replace(/^Content-Security-Policy:\s*/, '');
    expect(policy, 'production CSP must not use workers.dev wildcard').not.toMatch(
      /\*\.workers\.dev/
    );
    expect(policy, 'production CSP must not allow localhost').not.toMatch(/127\.0\.0\.1|localhost/);
    expect(policy, 'connect-src must list exact worker origin').toContain(
      `connect-src 'self' ${WORKER_ORIGIN}`
    );
    expect(policy, 'img-src must list exact worker origin for OG images').toContain(
      `img-src 'self' data: blob: ${WORKER_ORIGIN}`
    );

    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        (window as unknown as { __cspViolations: string[] }).__cspViolations =
          (window as unknown as { __cspViolations: string[] }).__cspViolations || [];
        (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
          `${e.violatedDirective}: ${e.blockedURI}`
        );
      });
    });

    const apiProbe = await page.request.get(`${API_ORIGIN}/api/health`);
    expect(apiProbe.ok(), `Worker health at ${API_ORIGIN}`).toBeTruthy();

    const analyzeProbe = await page.request.post(`${BASE}/api/analyze`, {
      data: { address: '1574 N Milwaukee Ave, Chicago, IL 60622', radius: 10 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(analyzeProbe.ok(), 'Proxied /api/analyze under CSP').toBeTruthy();

    await page.goto(WICKER, { waitUntil: 'load' });
    const summary = page.locator(
      '[data-testid="report-summary"], [data-testid="brands-to-pitch"]'
    );
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      if (await summary.first().isVisible().catch(() => false)) break;
      const tryAgain = page.getByRole('button', { name: 'Try again' });
      if (await tryAgain.isVisible().catch(() => false)) {
        await tryAgain.click();
      }
      await page.waitForTimeout(2000);
    }
    await expect(summary.first()).toBeVisible({ timeout: 10_000 });

    const pageViolations = await page.evaluate(() =>
      (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []
    );
    violations.push(...pageViolations);
    expect(violations, 'CSP violations on report').toEqual([]);

    const mapRoot = page.locator('.maplibregl-map').first();
    await expect(mapRoot).toBeVisible({ timeout: 60_000 });
    const mapHeight = await mapRoot.evaluate((el) => el.getBoundingClientRect().height);
    expect(mapHeight, '.maplibregl-map should be taller than 200px').toBeGreaterThan(200);

    const mapCanvas = page.locator('.maplibregl-canvas').first();
    const mapOk = await mapCanvas.evaluate((canvas) => {
      const el = canvas as HTMLCanvasElement;
      if (el.width < 50 || el.height < 50) return false;
      const gl = el.getContext('webgl') || el.getContext('webgl2');
      return Boolean(gl);
    });
    expect(mapOk, 'Map canvas should render WebGL tiles').toBe(true);
  });
});
