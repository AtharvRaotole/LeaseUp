import { test, expect } from '@playwright/test';

const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

test.describe('Prospecting agent receipt', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Wicker run logs planner rows and a review that changes the top 5', async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto('/');
    await page.getByPlaceholder(/Street address/i).fill(WICKER);
    await page.getByTestId('landing-run-prospecting').click();
    await expect(page.getByTestId('prospecting-page')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: 'Open pitch pack' })).toBeVisible({
      timeout: 240_000,
    });

    const receipt = page.getByTestId('agent-receipt');
    await receipt.scrollIntoViewIfNeeded();
    await expect(receipt).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('agent-receipt-planner-decision-0')).toContainText('Rule:');
    await expect(page.getByTestId('agent-receipt-planner')).not.toContainText(/for \.|that brand/);
    await expect(page.getByTestId('agent-receipt-planner')).toContainText('strongest taste match');

    const review = page.getByTestId('agent-receipt-review');
    await expect(review).toBeVisible();
    await expect(page.getByTestId('agent-receipt-review-summary')).toContainText(
      'Review changed the top 5 with 2 evidence-backed lifts'
    );
    await expect(page.getByTestId('agent-receipt-review-summary')).toContainText(
      'eligible lifts declined with a reason'
    );
    await expect(page.getByTestId('agent-receipt-review-action-0')).toContainText(
      'Vans moved from #5 to #4'
    );
    await expect(page.getByTestId('agent-receipt-review-before')).toContainText(
      "TJ Maxx, Victoria's Secret, J.Crew, H&M, Vans"
    );
    await expect(page.getByTestId('agent-receipt-review-after')).toContainText(
      "TJ Maxx, Victoria's Secret, J.Crew, Vans, Express"
    );
    const text = (await receipt.textContent()) ?? '';
    expect(text).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-/i);
  });
});
