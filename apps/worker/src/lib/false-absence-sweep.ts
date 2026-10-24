import { BLEECKER_NYC, DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures/worker';
import { nearestDemoOverpassMatchKm } from './osm-wikidata-absence-crosscheck';
import { loadStoreGroundTruthCatalog } from './false-positive-prospect-audit';
import type { ProspectPack } from '@leaseup/contracts';

export type FalseAbsenceSweepSite = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lon: number;
  radiusKm: number;
  demoFixture?: 'wicker' | 'boulder' | 'sevierville';
  evalInsightsId?: string;
};

export const FALSE_ABSENCE_SWEEP_SITES: FalseAbsenceSweepSite[] = [
  {
    id: 'wicker',
    label: 'Wicker Park demo chip',
    address: DEMO_CHIP_ADDRESSES.wicker,
    lat: 41.9097032,
    lon: -87.6768326,
    radiusKm: 10,
    demoFixture: 'wicker',
  },
  {
    id: 'boulder',
    label: 'Boulder demo chip',
    address: DEMO_CHIP_ADDRESSES.boulder,
    lat: 40.015,
    lon: -105.2705,
    radiusKm: 10,
    demoFixture: 'boulder',
  },
  {
    id: 'sevierville',
    label: 'Sevierville demo chip',
    address: DEMO_CHIP_ADDRESSES.sevierville,
    lat: 35.8681,
    lon: -83.5618,
    radiusKm: 10,
    demoFixture: 'sevierville',
  },
  {
    id: 'bleecker',
    label: '350 Bleecker St, NYC',
    address: BLEECKER_NYC.address,
    lat: BLEECKER_NYC.latitude,
    lon: BLEECKER_NYC.longitude,
    radiusKm: 10,
    evalInsightsId: 'nyc_williamsburg',
  },
];

export type FalseAbsenceViolation = {
  rank: number;
  entityId: string;
  name: string;
  verified: string;
  osmSnapshotKm?: number;
  demoOverpassKm?: number;
  source: string;
};

export function findFalseAbsenceViolations(
  repoRoot: string,
  site: FalseAbsenceSweepSite,
  prospects: ProspectPack[],
  includeDemoOverpassCrossCheck: boolean
): FalseAbsenceViolation[] {
  const catalog = loadStoreGroundTruthCatalog(repoRoot);
  const violations: FalseAbsenceViolation[] = [];

  prospects.forEach((pack, index) => {
    if (pack.brand.verified !== 'verified (2 sources)') return;

    const gt = catalog.presenceForBrand(
      pack.brand.entityId,
      site.lat,
      site.lon,
      site.radiusKm
    );
    let demoKm: number | undefined;
    if (includeDemoOverpassCrossCheck && site.demoFixture) {
      demoKm = nearestDemoOverpassMatchKm(
        site.demoFixture,
        pack.brand.entityId,
        site.lat,
        site.lon,
        site.radiusKm,
        pack.brand.name
      );
    }

    const osmKm = gt.osmKm;
    const inRadius = osmKm !== undefined || demoKm !== undefined;
    if (!inRadius) return;

    violations.push({
      rank: index + 1,
      entityId: pack.brand.entityId,
      name: pack.brand.name,
      verified: pack.brand.verified,
      osmSnapshotKm: osmKm,
      demoOverpassKm: demoKm,
      source: demoKm !== undefined ? 'demo_overpass_wikidata' : 'osm_snapshot',
    });
  });

  return violations;
}

export function buildFalseAbsenceAuditMarkdown(params: {
  generatedAt: string;
  before: { violations: number; prospectRows: number };
  after: { violations: number; prospectRows: number };
  changes: Array<{ site: string; brand: string; distanceKm: number; source: string }>;
  siteNotes?: string;
}): string {
  const lines = [
    '# False-absence sweep (verified missing-brand labels)',
    '',
    `Generated: ${params.generatedAt}`,
    '',
    'Top-10 prospects per site. A **false absence** is a prospect labeled **`verified (2 sources)`** as missing nearby while an OSM **brand:wikidata** cross-check (snapshot tiles + demo Overpass recordings + display aliases) finds a store within the analyze radius.',
    '',
    ...(params.siteNotes ? [params.siteNotes, ''] : []),
    '## Summary',
    '',
    '| Metric | Before | After |',
    '|--------|--------|-------|',
    `| Prospect rows (≤10 per site) | ${params.before.prospectRows} | ${params.after.prospectRows} |`,
    `| **False absence violations** | **${params.before.violations}** | **${params.after.violations}** |`,
    '',
  ];
  if (params.changes.length > 0) {
    lines.push('## Brands changed (now filtered or downgraded)', '', '| Site | Brand | Distance km | Source |', '|---|---|---:|---|');
    for (const row of params.changes) {
      lines.push(`| ${row.site} | ${row.brand} | ${row.distanceKm.toFixed(2)} | ${row.source} |`);
    }
    lines.push('');
  } else {
    lines.push('_No false-absence violations after fix._', '');
  }
  return lines.join('\n');
}
