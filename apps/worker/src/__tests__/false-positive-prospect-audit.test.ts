import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { AnalysisService } from '../services/analysis';
import {
  FALSE_POSITIVE_AUDIT_SITES,
  loadStoreGroundTruthCatalog,
  summarizeFalsePositiveReports,
  countOsmOnlyWouldBeFalsePositives,
  buildFalsePositiveAuditMarkdown,
  type SiteFalsePositiveReport,
} from '../lib/false-positive-prospect-audit';
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

const geocoded = JSON.parse(
  readFileSync(join(repoRoot, 'data/qloo-eval-40/geocoded.json'), 'utf8')
) as Array<{ id: string; lat: number; lon: number }>;
const geocodedById = new Map(geocoded.map((g) => [g.id, g]));

const insightsByEval = JSON.parse(
  readFileSync(join(repoRoot, 'data/qloo-eval-40/insights_affinity.json'), 'utf8')
) as Record<string, Record<string, { name: string; affinity: number }>>;

const adaptiveResults = JSON.parse(
  readFileSync(join(repoRoot, 'data/qloo-eval-40/results_adaptive.json'), 'utf8')
).per_address as Record<string, { r: number }>;

const assets = {
  fetch: async (url: string) => {
    if (url.includes('tiles.local')) {
      const path = url.replace('https://tiles.local', '');
      const file = join(publicRoot, path);
      try {
        const body = readFileSync(file);
        return new Response(body, { status: 200 });
      } catch {
        return new Response('missing', { status: 404 });
      }
    }
    if (url.includes('osm.local')) {
      const path = url.replace('https://osm.local', '');
      const file = join(publicRoot, path);
      try {
        const body = readFileSync(file);
        return new Response(body, { status: 200 });
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

function insightsForSite(site: (typeof FALSE_POSITIVE_AUDIT_SITES)[number]): QlooInsight[] {
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
  return site.evalId ? insightsForEval(site.evalId) : [];
}

function radiusKmForSite(site: (typeof FALSE_POSITIVE_AUDIT_SITES)[number]): number {
  if (site.kind === 'demo_chip') return 10;
  const adaptive = site.evalId ? adaptiveResults[site.evalId] : undefined;
  return adaptive?.r ?? site.radiusKm;
}

function mockOfflineAnalyze(
  service: AnalysisService,
  site: (typeof FALSE_POSITIVE_AUDIT_SITES)[number],
  lat: number,
  lon: number
): void {
  vi.spyOn(service['geocode'], 'resolveForAnalysis').mockResolvedValue({
    address: site.address,
    resolvedAddress: site.address,
    latitude: lat,
    longitude: lon,
    city: '',
    neighborhood: '',
  });
  vi.spyOn(service['qloo'], 'getBrandInsights').mockResolvedValue(insightsForSite(site));
  vi.spyOn(service['qloo'], 'getTradeAreaTasteContext').mockResolvedValue(null);
  vi.spyOn(service['qloo'], 'getTradeAreaShopperTagInsights').mockResolvedValue(undefined);
}

async function runSiteAudit(site: (typeof FALSE_POSITIVE_AUDIT_SITES)[number]): Promise<SiteFalsePositiveReport> {
  const geo = site.evalId ? geocodedById.get(site.evalId) : undefined;
  const lat = geo?.lat ?? site.lat;
  const lon = geo?.lon ?? site.lon;
  const radiusKm = radiusKmForSite(site);

  const kv = createCountingKvNamespace();
  const service = new AnalysisService(offlineLiveAnalyzeEnv(assets, kv.CACHE));

  mockOfflineAnalyze(service, site, lat, lon);

  const address =
    site.kind === 'demo_chip' && site.demoFixture
      ? DEMO_CHIP_ADDRESSES[site.demoFixture]
      : site.address;

  const result = await service.analyze({ address, radius: radiusKm }, `fp-audit-${site.id}`, 'ip');
  const catalog = loadStoreGroundTruthCatalog(repoRoot);

  const rows = result.prospects.map((pack, index) => {
    const gt = catalog.presenceForBrand(
      pack.brand.entityId,
      result.location.latitude,
      result.location.longitude,
      radiusKm,
      site.evalId
    );
    const productSeesStore =
      (pack.brand.nearbyStoreCount ?? 0) > 0 ||
      pack.brand.verified === 'conflict - likely present';
    return {
      rank: index + 1,
      entityId: pack.brand.entityId,
      name: pack.brand.name,
      verified: pack.brand.verified,
      productSeesStoreInRadius: productSeesStore,
      groundTruth: gt,
      isFalsePositive: !productSeesStore && gt.inRadius,
    };
  });

  const falsePositives = rows.filter((r) => r.isFalsePositive);

  return {
    site: { ...site, lat, lon, radiusKm },
    prospectCount: rows.length,
    falsePositiveCount: falsePositives.length,
    rows: rows.map(({ isFalsePositive: _, ...rest }) => rest),
  };
}

async function runSiteAuditWithoutOsmConflict(
  site: (typeof FALSE_POSITIVE_AUDIT_SITES)[number]
): Promise<{ falsePositives: number; cases: string[] }> {
  const geo = site.evalId ? geocodedById.get(site.evalId) : undefined;
  const lat = geo?.lat ?? site.lat;
  const lon = geo?.lon ?? site.lon;
  const radiusKm = radiusKmForSite(site);

  const kv = createCountingKvNamespace();
  const service = new AnalysisService(offlineLiveAnalyzeEnv(assets, kv.CACHE));

  vi.spyOn(
    service as unknown as {
      verifyFromOsmSnapshot: () => Promise<{
        status: 'verified (2 sources)';
        sources: string[];
      }>;
    },
    'verifyFromOsmSnapshot'
  ).mockResolvedValue({
    status: 'verified (2 sources)',
    sources: ['All The Places (CC0)', 'OpenStreetMap snapshot'],
  });

  mockOfflineAnalyze(service, site, lat, lon);

  const address =
    site.kind === 'demo_chip' && site.demoFixture
      ? DEMO_CHIP_ADDRESSES[site.demoFixture]
      : site.address;
  const result = await service.analyze({ address, radius: radiusKm }, `fp-before-${site.id}`, 'ip');
  const catalog = loadStoreGroundTruthCatalog(repoRoot);
  let falsePositives = 0;
  const cases: string[] = [];
  for (const pack of result.prospects) {
    const gt = catalog.presenceForBrand(
      pack.brand.entityId,
      result.location.latitude,
      result.location.longitude,
      radiusKm,
      site.evalId
    );
    if (gt.inRadius) {
      falsePositives += 1;
      cases.push(
        `${site.label} — ${pack.brand.name} (ATP ${gt.atpKm?.toFixed(2) ?? '—'} km, OSM ${gt.osmKm?.toFixed(2) ?? '—'} km)`
      );
    }
  }
  return { falsePositives, cases };
}

describe('False-positive audit (missing-brand prospects)', () => {
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

  it('demo embedded catalog: prospects respect ATP+OSM ground truth at 10 km (demo chips)', async () => {
    const catalog = loadStoreGroundTruthCatalog(repoRoot);
    for (const site of FALSE_POSITIVE_AUDIT_SITES.filter((s) => s.kind === 'demo_chip')) {
      const kv = createCountingKvNamespace();
      const service = new AnalysisService(offlineDemoAnalyzeEnv(assets, kv.CACHE));
      const result = await service.analyze(
        { address: DEMO_CHIP_ADDRESSES[site.demoFixture!], radius: 10 },
        `fp-demo-${site.id}`,
        'ip'
      );
      for (const pack of result.prospects) {
        const gt = catalog.presenceForBrand(
          pack.brand.entityId,
          result.location.latitude,
          result.location.longitude,
          10,
          site.evalId
        );
        expect(
          gt.inRadius,
          `${site.id}: ${pack.brand.name} pitched but ground truth in radius`
        ).toBe(false);
      }
    }
  });

  it('live geotile catalog: no top-10 prospect is absent when any store source shows presence in radius', async () => {
    const reports: SiteFalsePositiveReport[] = [];
    for (const site of FALSE_POSITIVE_AUDIT_SITES) {
      reports.push(await runSiteAudit(site));
    }
    const summary = summarizeFalsePositiveReports(reports);
    const failures: string[] = [];
    for (const report of reports) {
      for (const row of report.rows) {
        const gt = row.groundTruth;
        if (!gt.inRadius) continue;
        if (row.productSeesStoreInRadius) continue;
        failures.push(
          `${report.site.id} #${row.rank} ${row.name}: ATP=${gt.atpKm?.toFixed(2) ?? '-'} OSM=${gt.osmKm?.toFixed(2) ?? '-'} geotile=${gt.geotileKm?.toFixed(2) ?? '-'} verified=${row.verified}`
        );
      }
    }
    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.log('FALSE_POSITIVE_AUDIT_FAILURES\n' + failures.join('\n'));
    }
    expect(
      failures,
      `false positives=${summary.totalFalsePositives} / ${summary.totalProspects} prospects`
    ).toEqual([]);

    if (process.env.WRITE_FALSE_POSITIVE_AUDIT === '1') {
      let beforeFp = 0;
      const beforeCases: string[] = [];
      for (const site of FALSE_POSITIVE_AUDIT_SITES) {
        const before = await runSiteAuditWithoutOsmConflict(site);
        beforeFp += before.falsePositives;
        beforeCases.push(...before.cases);
      }
      const osmOnlyPrevented = reports.reduce(
        (n, r) => n + countOsmOnlyWouldBeFalsePositives(r.rows),
        0
      );
      const md = buildFalsePositiveAuditMarkdown({
        generatedAt: new Date().toISOString(),
        before: {
          totalProspects: summary.totalProspects,
          falsePositives: beforeFp,
          osmOnlyPrevented,
        },
        after: {
          totalProspects: summary.totalProspects,
          falsePositives: summary.totalFalsePositives,
        },
        beforeCases,
        reports,
      });
      const out = join(repoRoot, 'data/qloo-eval-40/FALSE_POSITIVE_AUDIT.md');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, md);
    }
  }, 120_000);

  function auditSite(id: string): (typeof FALSE_POSITIVE_AUDIT_SITES)[number] {
    const site = FALSE_POSITIVE_AUDIT_SITES.find((s) => s.id === id);
    if (!site) throw new Error(`missing audit site ${id}`);
    return site;
  }

  const OSM_CONFLICT_REGRESSIONS: Array<{
    label: string;
    site: (typeof FALSE_POSITIVE_AUDIT_SITES)[number];
    entityId: string;
  }> = [
    {
      label: 'American Eagle @ Wicker',
      site: auditSite('wicker'),
      entityId: '2D890327-8794-4C5A-898F-FFF0323325CF',
    },
    {
      label: 'Crumbl @ Boulder',
      site: auditSite('boulder'),
      entityId: '7C4CC0B9-1C3C-4C5C-A732-5991046EBB03',
    },
    {
      label: 'Crumbl @ Lakeview',
      site: auditSite('chi_lakeview'),
      entityId: '7C4CC0B9-1C3C-4C5C-A732-5991046EBB03',
    },
    {
      label: "Kohl's @ Naperville",
      site: auditSite('naperville_il'),
      entityId: '945C90D2-07D7-43B3-98FE-C437DE7A6D16',
    },
  ];

  for (const row of OSM_CONFLICT_REGRESSIONS) {
    it(`OSM conflict filters ${row.label} from prospects`, async () => {
      const geo = row.site.evalId ? geocodedById.get(row.site.evalId) : undefined;
      const lat = geo?.lat ?? row.site.lat;
      const lon = geo?.lon ?? row.site.lon;
      const radiusKm = radiusKmForSite(row.site);

      const kv = createCountingKvNamespace();
      const service = new AnalysisService(offlineLiveAnalyzeEnv(assets, kv.CACHE));
      mockOfflineAnalyze(service, row.site, lat, lon);

      const catalog = loadStoreGroundTruthCatalog(repoRoot);
      const gt = catalog.presenceForBrand(row.entityId, lat, lon, radiusKm, row.site.evalId);
      expect(gt.osmKm).toBeDefined();

      const address =
        row.site.kind === 'demo_chip' && row.site.demoFixture
          ? DEMO_CHIP_ADDRESSES[row.site.demoFixture]
          : row.site.address;
      const result = await service.analyze({ address, radius: radiusKm }, `fp-${row.label}`, 'ip');
      expect(result.prospects.some((p) => p.brand.entityId === row.entityId)).toBe(false);
    });
  }

});
