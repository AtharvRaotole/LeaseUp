import { test, expect } from '@playwright/test';
import { setAppTheme } from './theme-helpers';

test.describe('Landing hero product preview', () => {
  test('hero preview shows live fixture copy in light mode', async ({ page }) => {
    await setAppTheme(page, 'light');
    await page.goto('/');
    const preview = page.getByTestId('landing-hero-product-preview');
    await preview.waitFor({ timeout: 30_000 });
    await preview.scrollIntoViewIfNeeded();
    const frame = page.getByTestId('landing-hero-preview-frame');
    await expect(frame).toBeVisible({ timeout: 15_000 });
    await expect(frame.getByText(/local match/i).first()).toBeVisible();
    await expect(frame.getByText(/taste match/i)).toHaveCount(0);
  });

  test('hero preview shows local match copy in dark mode', async ({ page }) => {
    await setAppTheme(page, 'dark');
    await page.goto('/');
    const preview = page.getByTestId('landing-hero-product-preview');
    await preview.waitFor({ timeout: 30_000 });
    await preview.scrollIntoViewIfNeeded();
    const frame = page.getByTestId('landing-hero-preview-frame');
    await expect(frame).toBeVisible({ timeout: 15_000 });
    await expect(frame.getByText(/local match/i).first()).toBeVisible();
    await expect(frame.getByText(/taste match/i)).toHaveCount(0);
  });
});
