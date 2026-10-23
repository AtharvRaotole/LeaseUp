import { describe, it, expect } from 'vitest';
import { buildReportPath, parseReportSearch } from '../lib/report-params';

describe('report geocode params', () => {
  it('round-trips confirmed pin coordinates', () => {
    const path = buildReportPath({
      address: '350 Bleecker St, New York, NY',
      radius: 5,
      confirmedLocation: {
        address: '350 Bleecker St, New York, NY',
        latitude: 40.734,
        longitude: -74.003,
        neighborhood: 'West Village',
        city: 'New York',
        resolvedAddress: '350 Bleecker St, West Village',
      },
    });
    const params = new URLSearchParams(path.split('?')[1]);
    const parsed = parseReportSearch(params);
    expect(parsed?.confirmedLocation?.latitude).toBe(40.734);
    expect(parsed?.confirmedLocation?.neighborhood).toBe('West Village');
  });
});
