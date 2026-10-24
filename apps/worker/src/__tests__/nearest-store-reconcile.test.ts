import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reconcileNearestStoreKm,
  stripFalseAbsenceReasons,
} from '../lib/nearest-store-reconcile';
import type { ProspectPack } from '@leaseup/contracts';
import { NearbyPresenceCache } from '../lib/nearby-presence-cache';
import type { StoreCatalog } from '../services/store-catalog';
import type { OsmSnapshotCatalog } from '../services/osm-snapshot-catalog';

const REI = '205AF33F-118E-4C49-9721-6BDBAF981DA0';
const LOC = {
  address: '350 Bleecker St, New York, NY 10014',
  latitude: 40.73352,
  longitude: -74.00271,
  city: 'New York',
  neighborhood: 'West Village',
  resolvedAddress: '350 Bleecker St, New York, NY 10014',
};

describe('reconcileNearestStoreKm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers OSM when it is much closer than ATP', async () => {
    const catalog = {
      findStoresNearby: vi.fn().mockResolvedValue([{ distance: 25.5 }]),
    } as unknown as StoreCatalog;
    const presence = new NearbyPresenceCache(catalog, LOC);
    const osmSnapshot = {
      getNationalStoreCount: vi.fn().mockResolvedValue(190),
      nearestStoreKm: vi.fn().mockResolvedValue(2.1),
    } as unknown as OsmSnapshotCatalog;

    const result = await reconcileNearestStoreKm(REI, LOC, presence, osmSnapshot);
    expect(result.km).toBe(2.1);
    expect(result.unconfirmed).toBe(true);
  });

  it('strips ATP absence reason when reconciled nearest is inside absence radius', () => {
    const pack = {
      brand: { entityId: 'x', name: 'X', affinity: 1, affinityRank: 1, verified: 'unverified' },
      outreachDraft: '',
      reasons: ['No X store within 3 km (ATP catalog)', 'Other'],
      nearestExistingStoreKm: 2.4,
    } as ProspectPack;
    const next = stripFalseAbsenceReasons(pack, 3);
    expect(next.reasons).toEqual(['Other']);
  });

  it('uses ATP alone when OSM has no snapshot for the brand', async () => {
    const catalog = {
      findStoresNearby: vi.fn().mockResolvedValue([{ distance: 12 }]),
    } as unknown as StoreCatalog;
    const presence = new NearbyPresenceCache(catalog, LOC);
    const result = await reconcileNearestStoreKm(REI, LOC, presence, undefined);
    expect(result).toEqual({ km: 12, unconfirmed: false });
  });
});
