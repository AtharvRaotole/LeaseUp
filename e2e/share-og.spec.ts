import { test, expect } from '@playwright/test';

const WICKER_QUERY =
  'address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10&lat=41.9099418&lng=-87.6772824&pinConfirmed=1&neighborhood=Wicker%20Park';
const API_ORIGIN = (process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

test.describe('Share OG API', () => {
  test('share/report JSON and report.png return real prospect data', async ({ request }) => {
    const metaRes = await request.get(`${API_ORIGIN}/api/share/report?${WICKER_QUERY}&slug=wicker`);
    expect(metaRes.ok()).toBeTruthy();
    const meta = await metaRes.json();
    expect(meta.title).toMatch(/Wicker Park/i);
    expect(meta.imageUrl).toContain('/api/og/report.png');

    const pngRes = await request.get(meta.imageUrl.replace(/^https:\/\/[^/]+/, API_ORIGIN));
    expect(pngRes.ok()).toBeTruthy();
    expect(pngRes.headers()['content-type']).toContain('image/png');
    const buf = await pngRes.body();
    expect(buf.byteLength).toBeGreaterThan(2_000);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
  });
});
