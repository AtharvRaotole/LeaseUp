import { describe, expect, it } from 'vitest';
import { DEMO_PITCH_BOULDER_ULTA_ID } from '@leaseup/contracts';
import { loadDemoPitchSnapshot } from '../lib/demo-pitch-snapshot';

describe('loadDemoPitchSnapshot', () => {
  it('returns the committed Boulder Ulta demo pack', () => {
    const snapshot = loadDemoPitchSnapshot(DEMO_PITCH_BOULDER_ULTA_ID);
    expect(snapshot?.id).toBe(DEMO_PITCH_BOULDER_ULTA_ID);
    expect(snapshot?.prospects.length).toBeGreaterThan(0);
    expect(snapshot?.address).toContain('Pearl St');
  });

  it('returns null for unknown ids', () => {
    expect(loadDemoPitchSnapshot('not-a-real-pitch')).toBeNull();
  });
});
