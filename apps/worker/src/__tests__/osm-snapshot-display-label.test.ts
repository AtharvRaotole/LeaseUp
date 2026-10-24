import { describe, it, expect } from 'vitest';
import { osmSnapshotDisplayLabel, osmSnapshotRecordedAt } from '../services/osm-snapshot-catalog';

describe('osmSnapshotDisplayLabel', () => {
  it('matches the recorded-at instant in UTC', () => {
    const iso = osmSnapshotRecordedAt();
    const label = osmSnapshotDisplayLabel();
    const utc = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(iso));
    expect(label).toBe(`OpenStreetMap snapshot, ${utc}`);
  });
});
