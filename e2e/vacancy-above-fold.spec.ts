import { test, expect } from '@playwright/test';
import { waitForReportReady } from './report-helpers';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

test('vacancy above fold shows monthly estimate from user inputs', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(WICKER);
  await waitForReportReady(page);

  await expect(page.getByTestId('vacancy-above-fold')).toBeVisible();
  await expect(page.getByTestId('vacancy-above-fold-prompt')).toBeVisible();

  await page.getByTestId('vacancy-above-sqft').fill('2000');
  await page.getByTestId('vacancy-above-rent').fill('60');

  const headline = page.getByTestId('vacancy-monthly-headline');
  await expect(headline).toBeVisible();
  await expect(headline).toContainText('Every month this space sits empty costs about');
  await expect(headline).toContainText('$10,000');
  await expect(headline).toContainText('Your estimate');
});
