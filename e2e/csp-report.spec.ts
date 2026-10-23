import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&screenshot=1';
const BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const API_ORIGIN = (process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

test.describe('Production CSP on report + map', () => {
  test('report loads API and MapLibre canvas under Pages _headers CSP', async ({ page }) => {
    const csp = readFileSync(join(process.cwd(), 'apps/web/public/_headers'), 'utf8');
    const cspLine = csp
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('Content-Security-Policy:'));
    expect(cspLine, 'apps/web/public/_headers must define CSP').toBeTruthy();
    const policy = cspLine!.replace(/^Content-Security-Policy:\s*/, '');
    expect(policy, 'connect-src must allow worker API origin when VITE_API_URL is set').toMatch(
      /connect-src[^;]*(workers\.dev|127\.0\.0\.1:8787|localhost:8787)/
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

    await page.goto(WICKER, { waitUntil: 'domcontentloaded' });
    await page
      .locator('[data-testid="brands-to-pitch"]')
      .first()
      .waitFor({ timeout: 120_000 });

    const pageViolations = await page.evaluate(() =>
      (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []
    );
    violations.push(...pageViolations);
    expect(violations, 'CSP violations on report').toEqual([]);

    const mapCanvas = page.locator('.maplibregl-canvas').first();
    await expect(mapCanvas).toBeVisible({ timeout: 60_000 });
    const mapOk = await mapCanvas.evaluate((canvas) => {
      const el = canvas as HTMLCanvasElement;
      if (el.width < 50 || el.height < 50) return false;
      const gl = el.getContext('webgl') || el.getContext('webgl2');
      return Boolean(gl);
    });
    expect(mapOk, 'Map canvas should render WebGL tiles').toBe(true);
  });
});
