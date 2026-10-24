import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'node:path';
import type { PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';
import {
  mergeReconciledNearestProspect,
  RECONCILE_ON_READ_MAX_PROSPECTS,
  refreshPitchPackNearestStores,
  refreshProspectPacksNearest,
} from '../lib/snapshot-nearest-refresh';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineLiveAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

const AMERICAN_EAGLE = '2D890327-8794-4C5A-898F-FFF0323325CF';
const WICKER_LOC = {
  address: '1422 N Milwaukee Ave, Chicago, IL 60622',
  latitude: 41.9099418,
  longitude: -87.6772824,
  city: 'Chicago',
  neighborhood: 'Wicker Park',
  resolvedAddress: '1422 N Milwaukee Ave, Chicago, IL 60622',
};

function prospect(entityId: string, name: string, km: number): ProspectPack {
  return {
    brand: {
      entityId,
      name,
      affinity: 0.99,
      affinityRank: 100,
      verified: 'verified (2 sources)',
    },
    outreachDraft: '',
    reasons: [`No ${name} store within 3 km (All The Places store data)`],
    nearestExistingStoreKm: km,
  };
}

function pitchFromProspect(pack: ProspectPack): PitchPackSnapshot {
  return {
    id: '7255de71-0000-4000-8000-000000000001',
    createdAt: '2026-10-20T00:00:00.000Z',
    address: WICKER_LOC.address,
    location: WICKER_LOC,
    radiusKm: 10,
    absenceRadiusKm: 3,
    analysisTimestamp: '2026-10-20T00:00:00.000Z',
    runId: 'stale-run',
    prospects: [{ prospect: pack, whyLine: 'Why' }],
  };
}

describe('mergeReconciledNearestProspect', () => {
  it('keeps stored km when reconcile returns none', () => {
    const stored = prospect(AMERICAN_EAGLE, 'American Eagle Outfitters', 17.35);
    const reconciled = { ...stored, nearestExistingStoreKm: undefined };
    const { pack, snapshotOnly } = mergeReconciledNearestProspect(stored, reconciled, 3);
    expect(snapshotOnly).toBe(true);
    expect(pack.nearestExistingStoreKm).toBe(17.35);
  });

  it('uses reconciled km when present', () => {
    const stored = prospect(AMERICAN_EAGLE, 'American Eagle Outfitters', 17.35);
    const reconciled = { ...stored, nearestExistingStoreKm: 1.9 };
    const { pack, snapshotOnly } = mergeReconciledNearestProspect(stored, reconciled, 3);
    expect(snapshotOnly).toBe(false);
    expect(pack.nearestExistingStoreKm).toBe(1.9);
  });
});

describe('refreshProspectPacksNearest prospect cap', () => {
  it('reconciles only the first RECONCILE_ON_READ_MAX_PROSPECTS rows', async () => {
    installWorkersCacheApiStub();
    const repoRoot = join(__dirname, '../../../../');
    ensureWorkerGeotiles(repoRoot);

    const kv = {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace;

    const env = offlineLiveAnalyzeEnv(createDemoPublicAssetsFetcher(), kv);
    const base = prospect(AMERICAN_EAGLE, 'American Eagle Outfitters', 17.35);
    const overflow = prospect('00000000-0000-4000-8000-000000000099', 'Overflow Brand', 9.5);
    const packs = Array.from({ length: RECONCILE_ON_READ_MAX_PROSPECTS + 3 }, (_, i) =>
      i === 0 ? base : { ...overflow, brand: { ...overflow.brand, entityId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` } }
    );

    const { prospects, storeDistancesSnapshotOnly } = await refreshProspectPacksNearest(
      env,
      WICKER_LOC,
      packs,
      3
    );

    expect(prospects.length).toBe(packs.length);
    expect(storeDistancesSnapshotOnly).toBe(true);
    expect(prospects[0]!.nearestExistingStoreKm).toBeLessThan(5);
    expect(prospects[RECONCILE_ON_READ_MAX_PROSPECTS]!.nearestExistingStoreKm).toBe(9.5);
  });
});

describe('refreshPitchPackNearestStores (Wicker stale pitch)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconciles pre-#140 American Eagle km on read without persisting', async () => {
    installWorkersCacheApiStub();
    const repoRoot = join(__dirname, '../../../../');
    ensureWorkerGeotiles(repoRoot);

    const kv = {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace;

    const env = offlineLiveAnalyzeEnv(createDemoPublicAssetsFetcher(), kv);
    const stale = pitchFromProspect(
      prospect(AMERICAN_EAGLE, 'American Eagle Outfitters', 17.35370955548852)
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T15:00:00.000Z'));

    const refreshed = await refreshPitchPackNearestStores(env, stale);
    const aeProspect = refreshed.prospects[0]!.prospect;
    const km = aeProspect.nearestExistingStoreKm;
    expect(km).toBeDefined();
    expect(km!).toBeLessThan(5);
    expect(km!).not.toBeCloseTo(17.35, 0);
    expect(aeProspect.nearestExistingStoreUnconfirmed).not.toBe(true);
    expect(refreshed.storeDistancesSnapshotOnly).not.toBe(true);
    expect(refreshed.storeDistanceDataAsOf).toBe('2026-10-24T15:00:00.000Z');
  });
});
