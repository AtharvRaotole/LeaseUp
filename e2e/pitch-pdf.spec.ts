import { test, expect } from '@playwright/test';
import { countPdfPages } from './helpers/pdf-pages';

const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8787';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

test.describe('Pitch pack PDF', () => {
  test('letter PDF fits in three pages or fewer', async ({ page, baseURL }) => {
    test.setTimeout(180_000);

    const analyzeRes = await fetch(`${API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: WICKER, radius: 10 }),
    });
    expect(analyzeRes.ok).toBe(true);
    const results = await analyzeRes.json();

    const pitchRes = await fetch(`${API}/api/pitch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, radiusKm: 10 }),
    });
    expect(pitchRes.ok).toBe(true);
    const pitch = (await pitchRes.json()) as { id: string };

    await page.goto(`${baseURL}/pitch/${pitch.id}`);
    await expect(page.getByTestId('pitch-page')).toBeVisible({ timeout: 60_000 });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.55in', right: '0.65in', bottom: '0.55in', left: '0.65in' },
    });

    const pages = countPdfPages(Buffer.from(pdf));
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(pages).toBeLessThanOrEqual(3);
  });
});
