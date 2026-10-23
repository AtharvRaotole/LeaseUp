import { describe, expect, it } from 'vitest';
import { demoGeocodePreviewForAddress } from './demo-geocode-preview';

describe('demoGeocodePreviewForAddress', () => {
  it('returns confirm candidates for partial Wicker typing', () => {
    const preview = demoGeocodePreviewForAddress('1574 N Milwaukee Ave, Chicago');
    expect(preview?.needsConfirmation).toBe(true);
    expect(preview?.candidates.length).toBeGreaterThan(1);
    expect(preview?.candidates[0]?.neighborhood).toBe('Wicker Park');
  });

  it('skips when the full demo chip address is used', () => {
    expect(
      demoGeocodePreviewForAddress('1574 N Milwaukee Ave, Chicago, IL 60622')
    ).toBeNull();
  });
});
