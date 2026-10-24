import { describe, expect, it } from 'vitest';
import { dataModeBadge, reportPageData } from '../lib/data-mode-badge';

describe('header data badge', () => {
  it('never says live on a recorded demo report, even on a live worker', () => {
    const badge = dataModeBadge('live', reportPageData('demo', true));
    expect(badge.label).toBe('Recorded demo');
    expect(badge.shortLabel).toBe('Recorded');
    expect(badge.label).not.toMatch(/live/i);
  });

  it('shows recorded before demo chip results arrive', () => {
    expect(dataModeBadge('live', reportPageData(undefined, true)).label).toBe('Recorded demo');
  });

  it('keeps Live data for real live searches', () => {
    expect(dataModeBadge('live', reportPageData('live', false)).label).toBe('Live data');
    expect(dataModeBadge('live', reportPageData(undefined, false)).label).toBe('Live data');
    expect(dataModeBadge('live').shortLabel).toBe('Live');
  });

  it('keeps Demo data on a demo worker', () => {
    expect(dataModeBadge('demo').label).toBe('Demo data');
  });
});
