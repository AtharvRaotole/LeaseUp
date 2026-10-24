import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES, wickerLandingProspectTopEntityIds } from '@leaseup/fixtures';
import { AnalysisService } from '../services/analysis';
import {
  createDemoPublicAssetsFetcher,
  offlineDemoAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

const kv = {
  get: async () => null,
  put: async () => undefined,
} as unknown as KVNamespace;

describe('landing wicker hero parity', () => {
  it('demo analyze prospect order matches committed wicker landing fixture', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService(
      offlineDemoAnalyzeEnv(createDemoPublicAssetsFetcher(), kv)
    );

    const results = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10, storefrontSqFt: 2500 },
      'landing-wicker-parity',
      'ip'
    );

    const liveIds = results.prospects.slice(0, 10).map((p) => p.brand.entityId);
    expect(liveIds).toEqual(wickerLandingProspectTopEntityIds(10));
  });
});
