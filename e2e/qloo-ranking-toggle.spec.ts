import { test, expect } from '@playwright/test';
import { openReportSection, waitForDeepSections, waitForReportReady } from './report-helpers';

const WICKER =
  '/r/wicker?address=1574%20N%20Milwaukee%20Ave%2C%20Chicago%2C%20IL%2060622&radius=10';

test('Qloo vs chain-size toggle reorders proof ranking and nearby-match stat', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(WICKER);
  await waitForReportReady(page);
  await waitForDeepSections(page);

  const nearbyMatch = page.getByTestId('report-summary').getByText(/\d+ of 10/).first();
  const nearbyQloo = (await nearbyMatch.innerText()).trim();

  await openReportSection(page, 'report-section-how-we-know');
  await expect(page.getByTestId('qloo-ranking-toggle')).toBeVisible();

  const proofBrandCell = page.getByTestId('proof-ranking-row-0').locator('td').nth(1);
  const proofBrandQloo = (await proofBrandCell.innerText()).trim();

  await page.getByTestId('qloo-ranking-mode-baseline').click();

  const proofBrandBaseline = (await proofBrandCell.innerText()).trim();
  const nearbyBaseline = (await nearbyMatch.innerText()).trim();

  expect(proofBrandBaseline).not.toEqual(proofBrandQloo);
  expect(nearbyBaseline).not.toEqual(nearbyQloo);
});
