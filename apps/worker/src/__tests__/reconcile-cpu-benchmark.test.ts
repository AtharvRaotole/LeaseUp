import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { AnalysisService } from '../services/analysis';
import { refreshAnalysisNearestStores } from '../lib/snapshot-nearest-refresh';
import {
  createDemoPublicAssetsFetcher,
  ensureWorkerGeotiles,
  offlineDemoAnalyzeEnv,
} from './helpers/analysis-test-env';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

const ITERATIONS = 5;

/**
 * Local Node wall-clock proxy for Workers CPU on reconcile-on-read.
 * Measured cold wicker demo analyze (8 prospects): ~1 ms wall; steady median ~0.4 ms.
 * Workers free tier allows 10 ms CPU per request; reconcile alone stays well under 5 ms
 * at current prospect counts (≤10 pitched). CI asserts a generous wall budget to catch regressions.
 */
export const RECONCILE_ON_READ_WALL_BUDGET_MS = 12;

function medianMs(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

describe('reconcile-on-read CPU benchmark (local Node)', () => {
  it('measures refreshAnalysisNearestStores on demo chip analyzes', async () => {
    installWorkersCacheApiStub();
    const repoRoot = join(__dirname, '../../../../');
    ensureWorkerGeotiles(repoRoot);

    const kv = {
      get: async () => null,
      put: async () => undefined,
    } as unknown as KVNamespace;

    const env = offlineDemoAnalyzeEnv(createDemoPublicAssetsFetcher(), kv);
    const service = new AnalysisService(env);

    const sites: { label: string; address: string }[] = [
      { label: 'wicker', address: DEMO_CHIP_ADDRESSES.wicker },
      { label: 'boulder', address: DEMO_CHIP_ADDRESSES.boulder },
      { label: 'sevierville', address: DEMO_CHIP_ADDRESSES.sevierville },
    ];

    const report: Record<
      string,
      { prospects: number; coldMs: number; medianMs: number; p95Ms: number }
    > = {};

    for (const site of sites) {
      const analysis = await service.analyze(
        { address: site.address, radius: 10, storefrontSqFt: 2500 },
        `reconcile-bench-${site.label}`,
        'ip'
      );

      const coldT0 = performance.now();
      await refreshAnalysisNearestStores(env, analysis);
      const coldMs = performance.now() - coldT0;

      const samples: number[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const t0 = performance.now();
        await refreshAnalysisNearestStores(env, analysis);
        samples.push(performance.now() - t0);
      }
      const sorted = [...samples].sort((a, b) => a - b);
      report[site.label] = {
        prospects: analysis.prospects.length,
        coldMs,
        medianMs: medianMs(samples),
        p95Ms: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]!,
      };
    }

    console.log(JSON.stringify({ reconcileOnReadBench: report }, null, 2));

    const worstCold = Math.max(...Object.values(report).map((row) => row.coldMs));
    expect(worstCold).toBeLessThan(RECONCILE_ON_READ_WALL_BUDGET_MS);

    const largest = Object.values(report).sort((a, b) => b.prospects - a.prospects)[0]!;
    expect(largest.prospects).toBeGreaterThan(0);
    expect(largest.prospects).toBeLessThanOrEqual(10);
  });
});
