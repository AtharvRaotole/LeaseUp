import { describe, expect, it, beforeEach } from 'vitest';
import { executeProspectingAgentTool } from '../lib/prospecting-agent-tools';
import { createProspectingAgentState } from '../lib/prospecting-agent-state';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineDemoAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';
import { join } from 'node:path';

const WICKER_LOC = {
  address: DEMO_CHIP_ADDRESSES.wicker,
  latitude: 41.9099418,
  longitude: -87.6772824,
  city: 'Chicago',
  neighborhood: 'Wicker Park',
  resolvedAddress: DEMO_CHIP_ADDRESSES.wicker,
};

describe('executeProspectingAgentTool store_presence_lookup', () => {
  beforeEach(() => {
    installWorkersCacheApiStub();
    const repoRoot = join(__dirname, '../../../../');
    ensureWorkerGeotiles(repoRoot);
  });

  it('does not claim absence when entityId is missing', async () => {
    const env = offlineDemoAnalyzeEnv(createDemoPublicAssetsFetcher(), {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace);

    const result = await executeProspectingAgentTool(
      {
        name: 'store_presence_lookup',
        reason: 'Model omitted brand id.',
        arguments: { radiusKm: 10 },
      },
      {
        env,
        location: WICKER_LOC,
        radiusKm: 10,
        runId: 'missing-entity',
        qloo: { getBrandInsights: async () => [] } as never,
        mode: 'demo',
        state: createProspectingAgentState(),
      }
    );

    expect(result.summary).toMatch(/not checked/i);
    expect(result.payload?.checked).toBe(false);
    expect(result.summary).not.toMatch(/No stores within/i);
  });
});
