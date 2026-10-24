import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { waitForReportReady } from './report-helpers';

export const MAP_EXCLUDE = '.maplibregl-map, .maplibregl-ctrl-group, .maplibregl-canvas';

const WICKER = '1574 N Milwaukee Ave, Chicago, IL 60622';

export async function analyzeBlockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude(MAP_EXCLUDE)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

export async function createPitchPath(apiBase: string): Promise<string> {
  const analyzeRes = await fetch(`${apiBase}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: WICKER, radius: 10 }),
  });
  if (!analyzeRes.ok) throw new Error('analyze failed for pitch fixture');
  const results = await analyzeRes.json();
  const pitchRes = await fetch(`${apiBase}/api/pitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, radiusKm: 10 }),
  });
  if (!pitchRes.ok) throw new Error('pitch create failed');
  const pitch = await pitchRes.json();
  return `/pitch/${pitch.id}`;
}

export async function prepareReportPage(page: Page) {
  await waitForReportReady(page);
  await page.getByTestId('report-tour-dismiss').click({ timeout: 5000 }).catch(() => undefined);
}

export async function preparePitchPage(page: Page) {
  await page.getByTestId('pitch-pack-brief').waitFor({ timeout: 60_000 });
}
