import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8787';
const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

async function openPitchPage(page: import('@playwright/test').Page, baseURL: string) {
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
  await expect(page.getByTestId('pitch-pack-brief')).toBeVisible({ timeout: 60_000 });
  return pitch.id;
}

test.describe('Pitch pack polish', () => {
  test('390px layout and per-brand verification copy', async ({ page, baseURL }) => {
    test.setTimeout(180_000);
    await openPitchPage(page, baseURL!);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('pitch-brand-verification').first()).toContainText(
      /Checked against All The Places/
    );
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test('dark mode readable', async ({ page, baseURL }) => {
    test.setTimeout(180_000);
    await openPitchPage(page, baseURL!);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.getByTestId('pitch-brand-brief').first()).toBeVisible();
    const color = await page.getByTestId('pitch-pack-brief').evaluate((el) => getComputedStyle(el).color);
    expect(color).not.toBe('rgb(0, 0, 0)');
  });

  test('axe has no serious or critical violations', async ({ page, baseURL }) => {
    test.setTimeout(180_000);
    await openPitchPage(page, baseURL!);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(blocking).toEqual([]);
  });
});
