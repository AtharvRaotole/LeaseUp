import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { AnalysisService } from '../services/analysis';
import {
  FALSE_POSITIVE_AUDIT_SITES,
  loadStoreGroundTruthCatalog,
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
const OUT_MD = join(repoRoot, 'data/qloo-eval-40/ADAPTIVE_RADIUS_TRADE_AREA_AUDIT.md');

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
  if (!site.evalId) return [];
  const block = insightsByEval[site.evalId];
  return Object.entries(block ?? {})
    .map(([entity_id, row]) => ({
      entity_id,
      name: row.name,
      query: { affinity: row.affinity, affinity_rank: row.affinity },
    }))
    .sort((a, b) => (b.query?.affinity ?? 0) - (a.query?.affinity ?? 0));
}

function radiusKmForSite(site: (typeof FALSE_POSITIVE_AUDIT_SITES)[number]): number {
  if (site.kind === 'demo_chip') return 10;
  const adaptive = site.evalId ? adaptiveResults[site.evalId] : undefined;
  return adaptive?.r ?? site.radiusKm;
}

const TRADE_AREA_KM = 3;

type PitchRow = {
  siteId: string;
  brand: string;
  entityId: string;
  searchRadiusKm: number;
  absenceKm: number;
  atpKm: number | undefined;
  osmKm: number | undefined;
  inSearchRadius: boolean;
  within3KmAtpOsm: boolean;
};

describe('adaptive radius trade-area audit (13 sites)', () => {
  beforeAll(() => {
    ensureWorkerGeotiles(repoRoot);
  });

  it('reports pitched brands vs search radius and 3 km ATP/OSM', async () => {
    installWorkersCacheApiStub();
    const catalog = loadStoreGroundTruthCatalog(repoRoot);
    const pitches: PitchRow[] = [];
    const violations: PitchRow[] = [];

    for (const site of FALSE_POSITIVE_AUDIT_SITES) {
      const geo = site.evalId ? geocodedById.get(site.evalId) : undefined;
      const lat = geo?.lat ?? site.lat;
      const lon = geo?.lon ?? site.lon;
      const searchRadiusKm = radiusKmForSite(site);

      const kv = createCountingKvNamespace();
      const env =
        site.kind === 'demo_chip'
          ? offlineDemoAnalyzeEnv(assets, kv.CACHE)
          : offlineLiveAnalyzeEnv(assets, kv.CACHE);
      const service = new AnalysisService(env);

      const { vi } = await import('vitest');
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

      const address =
        site.kind === 'demo_chip' && site.demoFixture
          ? DEMO_CHIP_ADDRESSES[site.demoFixture]
          : site.address;

      const result = await service.analyze(
        { address, radius: searchRadiusKm },
        `trade-audit-${site.id}`,
        'ip'
      );
      const absenceKm = result.prospectFunnel?.absenceRadiusKm ?? searchRadiusKm;

      for (const pack of result.prospects) {
        const gt = catalog.presenceForBrand(
          pack.brand.entityId,
          result.location.latitude,
          result.location.longitude,
          Math.max(searchRadiusKm, TRADE_AREA_KM),
          site.evalId
        );
        const atpSearch = catalog.presenceForBrand(
          pack.brand.entityId,
          result.location.latitude,
          result.location.longitude,
          searchRadiusKm,
          site.evalId
        );
        const atp3 = catalog.presenceForBrand(
          pack.brand.entityId,
          result.location.latitude,
          result.location.longitude,
          TRADE_AREA_KM,
          site.evalId
        );
        const atpKm = gt.atpKm;
        const osmKm = gt.osmKm;
        const minAtpOsm = [atpKm, osmKm].filter((d): d is number => d !== undefined);
        const nearestAtpOsm = minAtpOsm.length ? Math.min(...minAtpOsm) : undefined;
        const within3KmAtpOsm =
          atp3.inRadius ||
          (nearestAtpOsm !== undefined && nearestAtpOsm <= TRADE_AREA_KM);
        const inSearchRadius = atpSearch.inRadius;

        const row: PitchRow = {
          siteId: site.id,
          brand: pack.brand.name,
          entityId: pack.brand.entityId,
          searchRadiusKm,
          absenceKm,
          atpKm,
          osmKm,
          inSearchRadius,
          within3KmAtpOsm,
        };
        pitches.push(row);
        if (inSearchRadius || within3KmAtpOsm) violations.push(row);
      }
    }

    const wicker = pitches.filter((p) => p.siteId === 'wicker');
    const lines: string[] = [
      '# Adaptive radius trade-area audit',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      'Prospects after PR #101 (adaptive absence radius for pitching). Flags a pitch when **ground-truth catalog** shows ATP or OSM within the user **search radius** or within **3 km**.',
      '',
      `## Summary`,
      '',
      `- Sites: ${FALSE_POSITIVE_AUDIT_SITES.length}`,
      `- Pitch rows: ${pitches.length}`,
      `- Flagged (store in search radius or within 3 km ATP/OSM): **${violations.length}**`,
      '',
      '## Wicker Park pitches (nearest store km)',
      '',
      '| # | Brand | Absence km | ATP km | OSM km | In search radius | Within 3 km |',
      '|---|-------|------------|--------|--------|------------------|-------------|',
    ];
    wicker.forEach((row, i) => {
      lines.push(
        `| ${i + 1} | ${row.brand} | ${row.absenceKm} | ${fmt(row.atpKm)} | ${fmt(row.osmKm)} | ${row.inSearchRadius ? 'yes' : 'no'} | ${row.within3KmAtpOsm ? 'yes' : 'no'} |`
      );
    });

    if (violations.length > 0) {
      lines.push('', '## Flagged pitches (all sites)', '');
      for (const v of violations) {
        lines.push(
          `- **${v.siteId}** ${v.brand}: ATP ${fmt(v.atpKm)} km, OSM ${fmt(v.osmKm)} km (search ${v.searchRadiusKm} km, absence ${v.absenceKm} km)`
        );
      }
    }

    mkdirSync(dirname(OUT_MD), { recursive: true });
    writeFileSync(OUT_MD, lines.join('\n') + '\n');

    if (process.env.WRITE_TRADE_AREA_AUDIT === '1') {
      // eslint-disable-next-line no-console
      console.log('Wrote', OUT_MD);
    }

    const productViolations = violations.filter((v) => {
      const pitch = pitches.find(
        (p) => p.siteId === v.siteId && p.entityId === v.entityId
      );
      if (!pitch) return false;
      const nearest = [pitch.atpKm, pitch.osmKm].filter((d): d is number => d !== undefined);
      const minKm = nearest.length ? Math.min(...nearest) : undefined;
      return minKm !== undefined && minKm <= Math.min(pitch.searchRadiusKm, TRADE_AREA_KM);
    });

    expect(
      productViolations,
      `pitched with ATP/OSM within search or 3 km: ${productViolations.map((v) => `${v.siteId}:${v.brand}`).join(', ')}`
    ).toEqual([]);
  }, 60_000);
});

function fmt(km: number | undefined): string {
  return km === undefined ? '—' : km.toFixed(2);
}
