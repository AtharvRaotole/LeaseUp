import { describe, it, expect } from 'vitest';
import { analysisStoreDataDateLabel } from '../lib/store-data-dates';
import type { AnalysisResponse } from '@leaseup/contracts';

describe('analysisStoreDataDateLabel', () => {
  it('uses one UTC date from osmSnapshotRecordedAt when present', () => {
    const results = {
      timestamp: '2026-10-23T03:36:00.000Z',
      osmSnapshotRecordedAt: '2026-10-24T04:32:32.498Z',
    } as AnalysisResponse;
    expect(analysisStoreDataDateLabel(results)).toBe('Oct 24, 2026');
  });
});
