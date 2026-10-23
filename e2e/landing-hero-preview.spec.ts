import { test, expect } from '@playwright/test';

async function visibleHeroImg(page: import('@playwright/test').Page) {
  const light = page.getByTestId('landing-hero-preview-img-light');
  if (await light.isVisible()) return light;
  return page.getByTestId('landing-hero-preview-img-dark');
}

async function assertHeroPreviewImageLoads(page: import('@playwright/test').Page) {
  await page.goto('/');
  const preview = page.getByTestId('landing-hero-product-preview');
  await preview.waitFor({ timeout: 30_000 });
  await preview.scrollIntoViewIfNeeded();
  const img = await visibleHeroImg(page);
  await expect(img).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);
}

test.describe('Landing hero product preview', () => {
  test('hero preview image loads in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await assertHeroPreviewImageLoads(page);
  });

  test('hero preview image loads in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await assertHeroPreviewImageLoads(page);
  });
});
