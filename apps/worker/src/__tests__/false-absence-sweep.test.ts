import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { AnalysisService } from '../services/analysis';
import {
  FALSE_ABSENCE_SWEEP_SITES,
  findFalseAbsenceViolations,
  buildFalseAbsenceAuditMarkdown,
  type FalseAbsenceViolation,
} from '../lib/false-absence-sweep';
import * as osmWikidataAbsenceCrosscheck from '../lib/osm-wikidata-absence-crosscheck';
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
  REI_ENTITY_ID,
  BLEECKER_NYC,
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

function insightsForDemo(site: (typeof FALSE_ABSENCE_SWEEP_SITES)[number]): QlooInsight[] {
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

async function analyzeSite(site: (typeof FALSE_ABSENCE_SWEEP_SITES)[number]) {
  const kv = createCountingKvNamespace();
  const isDemo = Boolean(site.demoFixture);
  const service = new AnalysisService(
    isDemo
      ? offlineDemoAnalyzeEnv(assets, kv.CACHE)
      : offlineLiveAnalyzeEnv(assets, kv.CACHE)
  );

  if (!isDemo) {
    const geocode = service['geocode'] as { resolveForAnalysis: () => Promise<unknown> };
    vi.spyOn(geocode, 'resolveForAnalysis').mockResolvedValue({
      address: site.address,
      resolvedAddress: site.address,
      latitude: site.lat,
      longitude: site.lon,
      city: 'New York',
      neighborhood: 'West Village',
    });
    const qloo = service['qloo'] as {
      getBrandInsights: () => Promise<QlooInsight[]>;
      getTradeAreaTasteContext: () => Promise<null>;
      getTradeAreaShopperTagInsights: () => Promise<undefined>;
    };
    vi.spyOn(qloo, 'getBrandInsights').mockResolvedValue(insightsForDemo(site));
    vi.spyOn(qloo, 'getTradeAreaTasteContext').mockResolvedValue(null);
    vi.spyOn(qloo, 'getTradeAreaShopperTagInsights').mockResolvedValue(undefined);
  }

  const address =
    site.demoFixture ? DEMO_CHIP_ADDRESSES[site.demoFixture] : site.address;
  return service.analyze({ address, radius: site.radiusKm }, `fa-${site.id}`, 'ip');
}

describe('False-absence sweep (verified missing-brand)', () => {
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

  it('demo Overpass wikidata cross-check finds Crumbl near Boulder recording', () => {
    const km = osmWikidataAbsenceCrosscheck.nearestDemoOverpassMatchKm(
      'boulder',
      '7C4CC0B9-1C3C-4C5C-A732-5991046EBB03',
      40.0179234,
      -105.2805434,
      10,
      'Crumbl'
    );
    expect(km).toBeDefined();
    expect(km!).toBeLessThan(3);
  });

  it('does not label verified (2 sources) when OSM wikidata shows a store in radius', async () => {
    const beforeViolations: FalseAbsenceViolation[] = [];
    const afterViolations: FalseAbsenceViolation[] = [];
    let prospectRows = 0;
    const changes: Array<{ site: string; brand: string; distanceKm: number; source: string }> =
      [];

    for (const site of FALSE_ABSENCE_SWEEP_SITES) {
      const demoCrosscheckSpy = vi
        .spyOn(osmWikidataAbsenceCrosscheck, 'nearestDemoOverpassMatchKm')
        .mockReturnValue(undefined);
      const beforeResult = await analyzeSite(site);
      demoCrosscheckSpy.mockRestore();

      const baseline = findFalseAbsenceViolations(
        repoRoot,
        site,
        beforeResult.prospects,
        true
      );
      beforeViolations.push(...baseline);
      for (const v of baseline) {
        const distance = v.demoOverpassKm ?? v.osmSnapshotKm ?? 0;
        changes.push({
          site: site.label,
          brand: v.name,
          distanceKm: distance,
          source: v.source,
        });
      }

      const result = await analyzeSite(site);
      prospectRows += result.prospects.length;

      const still = findFalseAbsenceViolations(repoRoot, site, result.prospects, true);
      afterViolations.push(...still);
    }

    if (process.env.WRITE_FALSE_ABSENCE_AUDIT === '1') {
      const md = buildFalseAbsenceAuditMarkdown({
        generatedAt: new Date().toISOString(),
        before: { violations: beforeViolations.length, prospectRows },
        after: { violations: afterViolations.length, prospectRows },
        changes,
        siteNotes:
          '**Before** replays analyze with demo Overpass wikidata cross-check disabled (pre-fix). **After** is current code. At integration head after PR #89, the top-10 sweep is **0 → 0** because committed OSM snapshot tiles already downgrade in-radius stores (e.g. Crumbl@Boulder, AEO@Wicker); demo wikidata cross-check still guards demo mode when snapshot `hasBrandNearby` misses but recorded Overpass has a `brand:wikidata` hit. **350 Bleecker:** Qloo insights fixture is `nyc_williamsburg`; REI SoHo is covered by snapshot tiles + supplement (see `rei-bleecker-snapshot.test.ts`).',
      });
      const out = join(repoRoot, 'data/qloo-eval-40/FALSE_ABSENCE_AUDIT.md');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, md);
    }

    expect(
      afterViolations,
      `false absence violations: ${JSON.stringify(afterViolations)}`
    ).toEqual([]);
  }, 120_000);

  it('demo Overpass wikidata cross-check finds American Eagle near Wicker recording', () => {
    const km = osmWikidataAbsenceCrosscheck.nearestDemoOverpassMatchKm(
      'wicker',
      '2D890327-8794-4C5A-898F-FFF0323325CF',
      41.9097032,
      -87.6768326,
      10,
      'American Eagle Outfitters'
    );
    expect(km).toBeDefined();
    expect(km!).toBeLessThan(3);
  });

  it('REI at 350 Bleecker is not a verified-absent prospect when SoHo is in OSM tiles', async () => {
    const service = new AnalysisService(offlineLiveAnalyzeEnv(assets, createCountingKvNamespace().CACHE));
    const verify = (
      service as unknown as {
        verifyFromOsmSnapshot: (
          id: string,
          loc: { address: string; latitude: number; longitude: number },
          radius: number,
          name?: string
        ) => Promise<{ status: string }>;
      }
    ).verifyFromOsmSnapshot;

    const result = await verify.call(service, REI_ENTITY_ID, BLEECKER_NYC, 10, 'REI');
    expect(result.status).toBe('conflict - likely present');
  });
});
