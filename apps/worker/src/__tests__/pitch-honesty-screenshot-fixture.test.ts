import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PitchPackSnapshot, ProspectPack } from '@leaseup/contracts';
import { refreshPitchPackNearestStores } from '../lib/snapshot-nearest-refresh';
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

function prospect(km: number): ProspectPack {
  return {
    brand: {
      entityId: AMERICAN_EAGLE,
      name: 'American Eagle Outfitters',
      affinity: 0.99,
      affinityRank: 52,
      verified: 'verified (2 sources)',
    },
    outreachDraft: '',
    reasons: ['No American Eagle store within 3 km (All The Places store data)'],
    nearestExistingStoreKm: km,
  };
}

describe('pitch honesty screenshot fixture', () => {
  it('writes refreshed Wicker American Eagle pitch JSON when EXPORT_PITCH_HONESTY_FIXTURE=1', async () => {
    if (process.env.EXPORT_PITCH_HONESTY_FIXTURE !== '1') return;

    installWorkersCacheApiStub();
    const repoRoot = join(__dirname, '../../../../');
    ensureWorkerGeotiles(repoRoot);

    const kv = {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace;

    const env = offlineLiveAnalyzeEnv(createDemoPublicAssetsFetcher(), kv);
    const stale: PitchPackSnapshot = {
      id: '7255de71-0000-4000-8000-000000000001',
      createdAt: '2026-10-20T00:00:00.000Z',
      address: WICKER_LOC.address,
      location: WICKER_LOC,
      radiusKm: 10,
      absenceRadiusKm: 3,
      analysisTimestamp: '2026-10-20T00:00:00.000Z',
      runId: 'wicker-pitch-honesty',
      prospects: [{ prospect: prospect(17.35370955548852), whyLine: 'Why' }],
    };

    const refreshed = await refreshPitchPackNearestStores(env, stale);
    const out = join(repoRoot, 'apps/web/e2e/fixtures/wicker-american-eagle-pitch-refreshed.json');
    mkdirSync(join(repoRoot, 'apps/web/e2e/fixtures'), { recursive: true });
    writeFileSync(out, JSON.stringify(refreshed, null, 2) + '\n', 'utf8');
    console.log('Wrote', out, 'km', refreshed.prospects[0]?.prospect.nearestExistingStoreKm);
  });
});
