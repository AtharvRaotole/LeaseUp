import { describe, expect, it } from 'vitest';
import { demoGeocodePreviewForAddress } from '../lib/demo-geocode-preview';

describe('demoGeocodePreviewForAddress', () => {
  it('returns confirm candidates for partial Wicker typing', () => {
    const preview = demoGeocodePreviewForAddress('1574 N Milwaukee Ave, Chicago');
    expect(preview?.needsConfirmation).toBe(true);
    expect(preview?.candidates.length).toBeGreaterThan(1);
    expect(preview?.candidates[0]?.neighborhood).toBe('Wicker Park');
  });

  it('skips when the full demo chip address is used', () => {
    expect(
      demoGeocodePreviewForAddress('1560 N Milwaukee Ave, Chicago, IL 60622')
    ).toBeNull();
  });

  it('returns confirm candidates for 350 Bleecker in demo', () => {
    const preview = demoGeocodePreviewForAddress('350 Bleecker St, New York, NY 10014');
    expect(preview?.needsConfirmation).toBe(true);
    expect(preview?.candidates.length).toBe(2);
    expect(preview?.candidates[0]?.neighborhood).toBe('West Village');
    expect(preview?.candidates[1]?.neighborhood).toBe('Ridgewood');
  });
});
