import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForReportReady } from './report-helpers';

const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test.describe('Pipeline keyboard and screen reader', () => {
  test('board and CRM dialog are reachable without a mouse', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(`${BASE}/r/wicker?address=${encodeURIComponent(WICKER)}&radius=10`);
    await waitForReportReady(page);
    await page.getByTestId('report-primary-actions').getByTestId('add-to-pipeline').click();
    await expect(page.getByText('Added to pipeline')).toBeVisible({ timeout: 30_000 });

    await page.goto(`${BASE}/pipeline`);
    await expect(page.getByTestId('pipeline-board')).toBeVisible();

    const dragHandle = page.getByTestId('pipeline-card-drag-handle').first();
    await dragHandle.focus();
    await expect(dragHandle).toBeFocused();

    const openCard = page.getByRole('button', { name: /Open .+ pipeline details/ }).first();
    await openCard.focus();
    await expect(openCard).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = page.getByTestId('pipeline-card-dialog');
    await expect(dialog).toBeVisible();

    const statusSelect = page.getByTestId('pipeline-prospect-status');
    await statusSelect.focus();
    await expect(statusSelect).toBeFocused();
    await statusSelect.selectOption('sent_by_me');

    const moveButton = page.getByRole('button', { name: 'Set status to Replied' });
    await expect(moveButton).toBeEnabled();
    await moveButton.focus();
    await expect(moveButton).toBeFocused();
    await page.keyboard.press('Enter');

    const notes = page.getByTestId('pipeline-notes');
    await notes.focus();
    await expect(notes).toBeFocused();

    const blocking = await new AxeBuilder({ page })
      .include('[data-testid="pipeline-card-dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = blocking.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(serious).toEqual([]);
  });
});
