import type { GeocodePreviewResponse, Location } from '@leaseup/contracts';
import {
  boulderFixture,
  matchDemoFixtureId,
  seviervilleFixture,
  wickerparkFixture,
} from '@leaseup/fixtures/worker';
import { GeocodeAmbiguousError } from '../lib/errors';
import { candidateToLocation, resolveGeocodeFromCandidates } from '../lib/geocode-resolve';
import { NominatimClient } from './nominatim';
import type { ResponseCache } from '../lib/response-cache';

function demoFixtureLocation(address: string): Location {
  const fixtureId = matchDemoFixtureId(address);
  if (!fixtureId) {
    throw new Error('Demo mode only supports the three example addresses on the home page.');
  }
  const fixture =
    fixtureId === 'wicker'
      ? wickerparkFixture
      : fixtureId === 'boulder'
        ? boulderFixture
        : seviervilleFixture;
  const placeParts = fixture.location.name.split(',').map((p) => p.trim()).filter(Boolean);
  const neighborhood = placeParts[0] ?? fixture.location.name;
  const city = placeParts.length > 1 ? placeParts.slice(1).join(', ') : undefined;
  return {
    address,
    latitude: fixture.location.latitude,
    longitude: fixture.location.longitude,
    neighborhood,
    city,
    resolvedAddress: fixture.location.name,
  };
}

export class GeocodeService {
  private nominatim: NominatimClient;
  private mode: 'live' | 'demo';

  constructor(cache: ResponseCache, contact: string, mode: 'live' | 'demo') {
    this.nominatim = new NominatimClient(cache, contact);
    this.mode = mode;
  }

  async preview(address: string): Promise<GeocodePreviewResponse> {
    if (this.mode === 'demo') {
      const location = demoFixtureLocation(address);
      return {
        needsConfirmation: false,
        candidates: [
          {
            address,
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city,
            neighborhood: location.neighborhood,
            resolvedAddress: location.resolvedAddress ?? location.address,
          },
        ],
        location,
      };
    }

    let raw = await this.nominatim.geocodeCandidates(address, 5);
    if (raw.length === 0) {
      raw = await this.nominatim.legacyGeocodeCandidates(address, 5);
    }
    const resolved = resolveGeocodeFromCandidates(address, raw);
    return {
      needsConfirmation: resolved.needsConfirmation,
      candidates: resolved.candidates,
      location: resolved.location,
    };
  }

  async resolveForAnalysis(address: string, confirmed?: Location): Promise<Location> {
    if (confirmed) return confirmed;
    if (this.mode === 'demo') {
      return demoFixtureLocation(address);
    }
    const preview = await this.preview(address);
    if (preview.needsConfirmation || !preview.location) {
      throw new GeocodeAmbiguousError(preview.candidates);
    }
    return preview.location;
  }

  async resolveNeighborhood(latitude: number, longitude: number, candidate?: { neighborhood?: string }) {
    if (candidate?.neighborhood) return candidate.neighborhood;
    return this.nominatim.reverseGeocode(latitude, longitude);
  }

  candidateToLocation(inputAddress: string, candidate: GeocodePreviewResponse['candidates'][number], neighborhood?: string) {
    return candidateToLocation(inputAddress, candidate, neighborhood);
  }
}
