import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AnalysisService } from '../services/analysis';
import { FALSE_ABSENCE_SWEEP_SITES } from '../lib/false-absence-sweep';
import { loadStoreGroundTruthCatalog } from '../lib/false-positive-prospect-audit';
import { demoChipOsmAbsenceViolations } from '../lib/demo-chip-osm-absence-guard';
import {
  createCountingKvNamespace,
  installWorkersCacheApiStub,
} from './helpers/kv-counting';
import {
  ensureWorkerGeotiles,
  offlineDemoAnalyzeEnv,
  offlineLiveAnalyzeEnv,
} from './helpers/analysis-test-env';
import {
  DEMO_CHIP_ADDRESSES,
  wickerparkFixture,
  boulderFixture,
  seviervilleFixture,
} from '@leaseup/fixtures/worker';
import type { QlooInsight } from '../providers/qloo';

const repoRoot = join(__dirname, '../../../../');
const publicRoot = join(__dirname, '../../public');

const insightsByEval = JSON.parse(
  readFileSync(join(repoRoot, 'data/qloo-eval-40/insights_affinity.json'), 'utf8')
) as Record<string, Record<string, { name: string; affinity: number }>>;

const assets = {
  fetch: async (url: string) => {
    if (url.includes('tiles.local') || url.includes('osm.local')) {
      const path = url.replace('https://tiles.local', '').replace('https://osm.local', '');
      const file = join(publicRoot, path);
      try {
        return new Response(readFileSync(file), { status: 200 });
      } catch {
        return new Response('missing', { status: 404 });
      }
    }
    return new Response('missing', { status: 404 });
  },
} as unknown as Fetcher;

function insightsForEval(evalId: string): QlooInsight[] {
  const block = insightsByEval[evalId];
  if (!block) return [];
  return Object.entries(block)
    .map(([entity_id, row]) => ({
      entity_id,
      name: row.name,
      query: { affinity: row.affinity, affinity_rank: row.affinity },
    }))
    .sort((a, b) => (b.query?.affinity ?? 0) - (a.query?.affinity ?? 0));
}

function insightsForSite(site: (typeof FALSE_ABSENCE_SWEEP_SITES)[number]): QlooInsight[] {
  if (site.demoFixture === 'wicker') {
    return wickerparkFixture.insights.map((row) => ({
      entity_id: row.entity_id,
      name: row.name,
      query: { affinity: row.affinity, affinity_rank: row.affinity_rank },
    }));
  }
  if (site.demoFixture === 'boulder') {
    return boulderFixture.insights.map((row) => ({
      entity_id: row.entity_id,
      name: row.name,
      query: { affinity: row.affinity, affinity_rank: row.affinity_rank },
    }));
  }
  if (site.demoFixture === 'sevierville') {
    return seviervilleFixture.insights.map((row) => ({
      entity_id: row.entity_id,
      name: row.name,
      query: { affinity: row.affinity, affinity_rank: row.affinity_rank },
    }));
  }
  return site.evalInsightsId ? insightsForEval(site.evalInsightsId) : [];
}

function mockOfflineAnalyze(
  service: AnalysisService,
  site: (typeof FALSE_ABSENCE_SWEEP_SITES)[number]
): void {
  vi.spyOn(service['geocode'], 'resolveForAnalysis').mockResolvedValue({
    address: site.address,
    resolvedAddress: site.address,
    latitude: site.lat,
    longitude: site.lon,
    city: '',
    neighborhood: '',
  });
  vi.spyOn(service['qloo'], 'getBrandInsights').mockResolvedValue(insightsForSite(site));
  vi.spyOn(service['qloo'], 'getTradeAreaTasteContext').mockResolvedValue(null);
  vi.spyOn(service['qloo'], 'getTradeAreaShopperTagInsights').mockResolvedValue(undefined);
  vi.spyOn(service['qloo'], 'getBrandCoAffinityWithIncumbents').mockResolvedValue(null);
}

describe('demo chip OSM absence guard (CI)', () => {
  beforeAll(() => {
    ensureWorkerGeotiles(repoRoot);
  });

  beforeEach(() => {
    installWorkersCacheApiStub();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const site of FALSE_ABSENCE_SWEEP_SITES) {
    it(`${site.id}: top-10 prospects do not claim absence within absence km when OSM snapshot has a store inside`, async () => {
      const kv = createCountingKvNamespace();
      const isDemo = Boolean(site.demoFixture);
      const service = new AnalysisService(
        isDemo
          ? offlineDemoAnalyzeEnv(assets, kv.CACHE)
          : offlineLiveAnalyzeEnv(assets, kv.CACHE)
      );
      if (!isDemo) {
        mockOfflineAnalyze(service, site);
      }

      const address =
        site.demoFixture ? DEMO_CHIP_ADDRESSES[site.demoFixture] : site.address;
      const result = await service.analyze(
        { address, radius: site.radiusKm },
        `osm-guard-${site.id}`,
        'ip'
      );

      const absenceKm = result.prospectFunnel?.absenceRadiusKm ?? 3;
      const catalog = loadStoreGroundTruthCatalog(repoRoot);
      const violations = demoChipOsmAbsenceViolations(
        catalog,
        { lat: result.location.latitude, lon: result.location.longitude },
        absenceKm,
        result.prospects
      );

      expect(violations, violations.join('\n')).toEqual([]);
    }, 120_000);
  }
});
