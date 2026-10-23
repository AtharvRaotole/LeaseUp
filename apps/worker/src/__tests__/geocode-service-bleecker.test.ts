import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeocodeService } from '../services/geocode';
import { GeocodeAmbiguousError } from '../lib/errors';
import type { GeocodeCandidate } from '@leaseup/contracts';
import type { ResponseCache } from '../lib/response-cache';

const BLEECKER_INPUT = '350 Bleecker St, New York, NY 10014';

const nominatimRows: GeocodeCandidate[] = [
  {
    address: BLEECKER_INPUT,
    latitude: 40.73352,
    longitude: -74.00271,
    city: 'New York',
    neighborhood: 'West Village',
    resolvedAddress:
      '350 Bleecker Street, West Village, Manhattan, New York, New York, 10014, United States',
  },
  {
    address: BLEECKER_INPUT,
    latitude: 40.73355,
    longitude: -74.00275,
    neighborhood: 'West Village',
    resolvedAddress:
      '350, Bleecker Street, West Village, Manhattan, New York County, New York, 10014, United States',
  },
  {
    address: BLEECKER_INPUT,
    latitude: 40.7,
    longitude: -73.92,
    city: 'New York',
    neighborhood: 'Ridgewood',
    resolvedAddress:
      '350 Bleecker Street, Ridgewood, Brooklyn, Kings County, New York, 11237, United States',
  },
];

const cache = {
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
} as unknown as ResponseCache;

describe('GeocodeService Bleecker production shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preview does not ask for confirmation', async () => {
    const service = new GeocodeService(cache, 'test', 'live');
    const nominatim = (
      service as unknown as { nominatim: { geocodeCandidates: (a: string, l: number) => Promise<GeocodeCandidate[]> } }
    ).nominatim;
    vi.spyOn(nominatim, 'geocodeCandidates').mockResolvedValue(nominatimRows);

    const preview = await service.preview(BLEECKER_INPUT);
    expect(preview.needsConfirmation).toBe(false);
    expect(preview.location?.neighborhood).toBe('West Village');
  });

  it('resolveForAnalysis does not throw GEOCODE_AMBIGUOUS', async () => {
    const service = new GeocodeService(cache, 'test', 'live');
    const nominatim = (
      service as unknown as { nominatim: { geocodeCandidates: (a: string, l: number) => Promise<GeocodeCandidate[]> } }
    ).nominatim;
    vi.spyOn(nominatim, 'geocodeCandidates').mockResolvedValue(nominatimRows);

    await expect(service.resolveForAnalysis(BLEECKER_INPUT)).resolves.toMatchObject({
      neighborhood: 'West Village',
    });
  });

  it('still throws GEOCODE_AMBIGUOUS for Main St with no city', async () => {
    const service = new GeocodeService(cache, 'test', 'live');
    const nominatim = (
      service as unknown as { nominatim: { geocodeCandidates: (a: string, l: number) => Promise<GeocodeCandidate[]> } }
    ).nominatim;
    vi.spyOn(nominatim, 'geocodeCandidates').mockResolvedValue([
      {
        address: 'Main St',
        latitude: 42.35,
        longitude: -71.05,
        city: 'Cambridge',
        resolvedAddress: 'Main Street, Cambridge, Massachusetts, United States',
      },
      {
        address: 'Main St',
        latitude: 40.71,
        longitude: -74.0,
        city: 'New York',
        resolvedAddress: 'Main Street, Manhattan, New York, United States',
      },
    ]);

    await expect(service.resolveForAnalysis('Main St')).rejects.toBeInstanceOf(GeocodeAmbiguousError);
  });
});
