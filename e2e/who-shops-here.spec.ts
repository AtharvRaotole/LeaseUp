import { test, expect } from '@playwright/test';

test('demo report shows Who shops here card', async ({ page }) => {
  await page.goto('/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10');
  await expect(page.getByTestId('who-shops-here')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('who-shops-here')).toContainText('Shoppers here over-index');
});
