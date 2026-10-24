import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { coveringGeohash3 } from './geohash';
import { DEMO_CHIP_ADDRESSES, type DemoFixtureId } from '@leaseup/fixtures/worker';

export type AuditSiteKind = 'demo_chip' | 'eval_recorded';

export type FalsePositiveAuditSite = {
  id: string;
  label: string;
  kind: AuditSiteKind;
  address: string;
  lat: number;
  lon: number;
  radiusKm: number;
  category: string;
  evalId?: string;
  demoFixture?: DemoFixtureId;
};

/** 3 demo chips + 10 eval addresses with geocoded + insights_affinity + ground_truth store fixtures. */
export const FALSE_POSITIVE_AUDIT_SITES: FalsePositiveAuditSite[] = [
  {
    id: 'wicker',
    kind: 'demo_chip',
    label: 'Wicker Park demo chip',
    address: DEMO_CHIP_ADDRESSES.wicker,
    lat: 41.9097032,
    lon: -87.6768326,
    radiusKm: 10,
    category: 'dense_urban',
    demoFixture: 'wicker',
    evalId: 'chi_wicker',
  },
  {
    id: 'boulder',
    kind: 'demo_chip',
    label: 'Boulder demo chip',
    address: DEMO_CHIP_ADDRESSES.boulder,
    lat: 40.015,
    lon: -105.2705,
    radiusKm: 10,
    category: 'college_town',
    demoFixture: 'boulder',
    evalId: 'boulder_co',
  },
  {
    id: 'sevierville',
    kind: 'demo_chip',
    label: 'Sevierville demo chip',
    address: DEMO_CHIP_ADDRESSES.sevierville,
    lat: 35.8681,
    lon: -83.5618,
    radiusKm: 10,
    category: 'tourist',
    demoFixture: 'sevierville',
    evalId: 'sevierville_tn',
  },
  {
    id: 'chi_lakeview',
    kind: 'eval_recorded',
    label: 'Lakeview Chicago',
    address: '3400 N Southport Ave, Chicago, IL 60657',
    lat: 41.9435638,
    lon: -87.6641472,
    radiusKm: 1.5,
    category: 'dense_urban',
    evalId: 'chi_lakeview',
  },
  {
    id: 'nyc_williamsburg',
    kind: 'eval_recorded',
    label: 'Williamsburg Brooklyn',
    address: '250 Bedford Ave, Brooklyn, NY 11249',
    lat: 40.7158723,
    lon: -73.9600453,
    radiusKm: 1.5,
    category: 'dense_urban',
    evalId: 'nyc_williamsburg',
  },
  {
    id: 'naperville_il',
    kind: 'eval_recorded',
    label: 'Naperville IL',
    address: '100 W Jefferson Ave, Naperville, IL 60540',
    lat: 41.7728699,
    lon: -88.1479278,
    radiusKm: 3,
    category: 'affluent_suburban',
    evalId: 'naperville_il',
  },
  {
    id: 'wellesley_ma',
    kind: 'eval_recorded',
    label: 'Wellesley MA',
    address: '60 Central St, Wellesley, MA 02482',
    lat: 42.2964851,
    lon: -71.2925269,
    radiusKm: 3,
    category: 'affluent_suburban',
    evalId: 'wellesley_ma',
  },
  {
    id: 'hutchinson_ks',
    kind: 'eval_recorded',
    label: 'Hutchinson KS',
    address: '100 N Main St, Hutchinson, KS 67501',
    lat: 38.052742,
    lon: -97.933172,
    radiusKm: 5,
    category: 'small_town',
    evalId: 'hutchinson_ks',
  },
  {
    id: 'sedalia_mo',
    kind: 'eval_recorded',
    label: 'Sedalia MO',
    address: '200 S Ohio Ave, Sedalia, MO 65301',
    lat: 38.704456,
    lon: -93.228261,
    radiusKm: 5,
    category: 'small_town',
    evalId: 'sedalia_mo',
  },
  {
    id: 'annarbor_mi',
    kind: 'eval_recorded',
    label: 'Ann Arbor MI',
    address: '300 S State St, Ann Arbor, MI 48104',
    lat: 42.276072,
    lon: -83.74088,
    radiusKm: 1.5,
    category: 'college_town',
    evalId: 'annarbor_mi',
  },
  {
    id: 'frisco_tx',
    kind: 'eval_recorded',
    label: 'Frisco TX strip',
    address: '3300 Dallas Pkwy, Frisco, TX 75034',
    lat: 33.104193,
    lon: -96.82574,
    radiusKm: 3,
    category: 'sunbelt_growth',
    evalId: 'frisco_tx',
  },
  {
    id: 'gilbert_az',
    kind: 'eval_recorded',
    label: 'Gilbert AZ',
    address: '2218 E Williams Field Rd, Gilbert, AZ 85295',
    lat: 33.307838,
    lon: -111.742233,
    radiusKm: 3,
    category: 'sunbelt_growth',
    evalId: 'gilbert_az',
  },
  {
    id: 'branson_mo',
    kind: 'eval_recorded',
    label: 'Branson MO',
    address: '100 Branson Landing Blvd, Branson, MO 65616',
    lat: 36.643653,
    lon: -93.218513,
    radiusKm: 3,
    category: 'tourist',
    evalId: 'branson_mo',
  },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tileStoreCoords(lat: number, lon: number): [number, number] {
  if (Math.abs(lat) > 90) return [lat / 1e5, lon / 1e5];
  if (Math.abs(lon) > 180) return [lat, lon / 1e5];
  return [lat, lon];
}

type SupplementRow = {
  brandId: string;
  lat: number;
  lon: number;
  targets?: string[];
};

type ExpandedBrand = { name: string; locations: Array<[number, number]> };

export type StorePresenceGroundTruth = {
  inRadius: boolean;
  atpKm?: number;
  osmKm?: number;
  geotileKm?: number;
  evalAtpInR?: number;
  evalOsmInR?: number;
  sources: string[];
};

export function loadStoreGroundTruthCatalog(repoRoot: string) {
  const atpExpanded = JSON.parse(
    readFileSync(join(repoRoot, 'data/brands/store-locations.expanded.min.json'), 'utf8')
  ).data as Record<string, ExpandedBrand>;

  const supplements: SupplementRow[] = existsSync(
    join(repoRoot, 'data/store-location-supplements.json')
  )
    ? (JSON.parse(readFileSync(join(repoRoot, 'data/store-location-supplements.json'), 'utf8'))
        .stores ?? [])
    : [];

  const geotileDir = join(repoRoot, 'apps/worker/public/tiles');
  const geotileBrandsPath = join(geotileDir, 'brands.json');
  const geotilesAvailable = existsSync(geotileBrandsPath);
  let geotileIdx = new Map<string, number>();
  const geotileCache = new Map<string, { stores: Array<[number, number, number]> } | null>();
  if (geotilesAvailable) {
    const geotileBrands = JSON.parse(readFileSync(geotileBrandsPath, 'utf8')).brands as Array<{
      id: string;
    }>;
    geotileIdx = new Map(geotileBrands.map((b, i) => [b.id, i]));
  }

  const osmTilesDir = join(repoRoot, 'data/osm-snapshot/tiles');
  const osmBrands = JSON.parse(readFileSync(join(osmTilesDir, 'brands.json'), 'utf8')).brands as Array<{
    id: string;
  }>;
  const osmBrandIdx = new Map(osmBrands.map((b, i) => [b.id, i]));
  const osmTileCache = new Map<string, { stores: Array<[number, number, number]> } | null>();

  const aliases = existsSync(join(repoRoot, 'data/brands/display-aliases.json'))
    ? (JSON.parse(readFileSync(join(repoRoot, 'data/brands/display-aliases.json'), 'utf8')) as Record<
        string,
        string
      >)
    : {};

  let evalGroundTruth: {
    addresses: Record<
      string,
      { radius_km: number; brands: Record<string, { atp_in_r?: number; osm_in_r?: number }> }
    >;
  } | null = null;
  const gtPath = join(repoRoot, 'data/qloo-eval-40/ground_truth.json');
  if (existsSync(gtPath)) {
    evalGroundTruth = JSON.parse(readFileSync(gtPath, 'utf8'));
  }

  function loadGeotile(gh: string) {
    if (geotileCache.has(gh)) return geotileCache.get(gh)!;
    const file = join(geotileDir, `${gh}.json`);
    if (!existsSync(file)) {
      geotileCache.set(gh, null);
      return null;
    }
    const tile = JSON.parse(readFileSync(file, 'utf8')) as { stores: Array<[number, number, number]> };
    geotileCache.set(gh, tile);
    return tile;
  }

  function loadOsmTile(gh: string) {
    if (osmTileCache.has(gh)) return osmTileCache.get(gh)!;
    const file = join(osmTilesDir, `${gh}.json`);
    if (!existsSync(file)) {
      osmTileCache.set(gh, null);
      return null;
    }
    const tile = JSON.parse(readFileSync(file, 'utf8')) as { stores: Array<[number, number, number]> };
    osmTileCache.set(gh, tile);
    return tile;
  }

  function nearestInTree(
    brandId: string,
    lat: number,
    lon: number,
    radiusKm: number,
    kind: 'atp' | 'osm' | 'geotile'
  ): number | undefined {
    if (kind === 'geotile' && !geotilesAvailable) {
      return nearestInTree(brandId, lat, lon, radiusKm, 'atp');
    }
    let nearest = Infinity;
    if (kind === 'atp') {
      const row = atpExpanded[brandId];
      if (row?.locations) {
        for (const [tLat, tLon] of row.locations) {
          const d = haversineKm(lat, lon, tLat, tLon);
          if (d <= radiusKm && d < nearest) nearest = d;
        }
      }
    } else {
      const brandIdx =
        kind === 'osm' ? osmBrandIdx.get(brandId) : geotileIdx.get(brandId);
      if (brandIdx === undefined) return undefined;
      const load = kind === 'osm' ? loadOsmTile : loadGeotile;
      for (const gh of coveringGeohash3(lat, lon, radiusKm)) {
        const tile = load(gh);
        if (!tile?.stores) continue;
        for (const [bIdx, rawLat, rawLon] of tile.stores) {
          if (bIdx !== brandIdx) continue;
          const [tLat, tLon] = tileStoreCoords(rawLat, rawLon);
          const d = haversineKm(lat, lon, tLat, tLon);
          if (d <= radiusKm && d < nearest) nearest = d;
        }
      }
    }
    for (const sup of supplements) {
      if (sup.brandId !== brandId) continue;
      const targets = sup.targets ?? ['atp', 'osm', 'osmData'];
      const key = kind === 'geotile' ? 'atp' : kind === 'osm' ? 'osm' : 'atp';
      if (!targets.includes(key) && !(kind === 'osm' && targets.includes('osmData'))) continue;
      const d = haversineKm(lat, lon, sup.lat, sup.lon);
      if (d <= radiusKm && d < nearest) nearest = d;
    }
    return nearest === Infinity ? undefined : nearest;
  }

  function presenceForBrand(
    brandId: string,
    lat: number,
    lon: number,
    radiusKm: number,
    evalId?: string
  ): StorePresenceGroundTruth {
    const atpKm = nearestInTree(brandId, lat, lon, radiusKm, 'atp');
    const osmKm = nearestInTree(brandId, lat, lon, radiusKm, 'osm');
    const geotileKm = nearestInTree(brandId, lat, lon, radiusKm, 'geotile');
    const sources: string[] = [];
    if (atpKm !== undefined) sources.push('atp_expanded');
    if (osmKm !== undefined) sources.push('osm_snapshot');
    if (geotileKm !== undefined) sources.push('atp_geotile');
    if (aliases[brandId]) sources.push(`alias:${aliases[brandId]}`);

    let evalAtpInR: number | undefined;
    let evalOsmInR: number | undefined;
    if (evalId && evalGroundTruth?.addresses[evalId]?.brands[brandId]) {
      const row = evalGroundTruth.addresses[evalId].brands[brandId];
      evalAtpInR = row.atp_in_r;
      evalOsmInR = row.osm_in_r;
      if ((row.atp_in_r ?? 0) > 0 && atpKm === undefined) sources.push('eval_atp_in_r');
      if ((row.osm_in_r ?? 0) > 0 && osmKm === undefined) sources.push('eval_osm_in_r');
    }

    const inRadius =
      atpKm !== undefined ||
      osmKm !== undefined ||
      geotileKm !== undefined ||
      (evalAtpInR ?? 0) > 0 ||
      (evalOsmInR ?? 0) > 0;

    return {
      inRadius,
      atpKm,
      osmKm,
      geotileKm,
      evalAtpInR,
      evalOsmInR,
      sources,
    };
  }

  return { presenceForBrand, atpExpanded, aliases };
}

export type ProspectFalsePositiveRow = {
  rank: number;
  entityId: string;
  name: string;
  verified: string;
  productSeesStoreInRadius: boolean;
  groundTruth: StorePresenceGroundTruth;
};

export type SiteFalsePositiveReport = {
  site: FalsePositiveAuditSite;
  prospectCount: number;
  falsePositiveCount: number;
  rows: ProspectFalsePositiveRow[];
};

export function summarizeFalsePositiveReports(reports: SiteFalsePositiveReport[]) {
  const totalProspects = reports.reduce((n, r) => n + r.prospectCount, 0);
  const totalFalsePositives = reports.reduce((n, r) => n + r.falsePositiveCount, 0);
  return { siteCount: reports.length, totalProspects, totalFalsePositives };
}

/** Prospects that would be false absences if OSM snapshot conflict checks were skipped. */
export function countOsmOnlyWouldBeFalsePositives(rows: ProspectFalsePositiveRow[]): number {
  return rows.filter((row) => {
    if (row.productSeesStoreInRadius) return false;
    const gt = row.groundTruth;
    const osmOnly =
      gt.osmKm !== undefined &&
      gt.atpKm === undefined &&
      gt.geotileKm === undefined &&
      (gt.evalAtpInR ?? 0) === 0;
    return osmOnly;
  }).length;
}

export function buildFalsePositiveAuditMarkdown(params: {
  generatedAt: string;
  before: { totalProspects: number; falsePositives: number; osmOnlyPrevented: number };
  after: { totalProspects: number; falsePositives: number };
  beforeCases?: string[];
  reports: SiteFalsePositiveReport[];
}): string {
  const lines: string[] = [
    '# False-positive audit: missing-brand prospects',
    '',
    `Generated: ${params.generatedAt}`,
    '',
    'Offline audit of **top-10 “who’s missing” prospects** per site. A false positive is a prospect shown as absent while **any** repo store source (ATP expanded, worker geotiles, OSM snapshot tiles, supplements, or eval `ground_truth.json` counts) has a location within the **adaptive absence radius** used for pitching (same as rankings presence).',
    '',
    '## Summary counts',
    '',
    '| Metric | Before | After |',
    '|--------|--------|-------|',
    `| Sites audited | ${params.reports.length} | ${params.reports.length} |`,
    `| Prospect rows (top-10 per site) | ${params.before.totalProspects} | ${params.after.totalProspects} |`,
    `| **False positives** (store present, still pitched) | **${params.before.falsePositives}** | **${params.after.falsePositives}** |`,
    `| OSM-only presence (would have slipped without snapshot verify) | ${params.before.osmOnlyPrevented} | — |`,
    '',
    '**Before** row replays analyze with `verifyFromOsmSnapshot` forced to never emit `conflict - likely present` (OSM in-radius stores could be pitched as missing). **After** is current `cursor/leaseup-v1-c429` with geotile catalog + snapshot conflict filtering.',
    '',
    ...(params.beforeCases && params.beforeCases.length > 0
      ? [
          '### Before baseline cases (fixed by snapshot verify)',
          '',
          ...params.beforeCases.map((line) => `- ${line}`),
          '',
        ]
      : []),
    '### Sites',
    '',
    '| Site | Category | Radius km | Prospects | FP after |',
    '|------|----------|-----------|-----------|----------|',
  ];

  for (const report of params.reports) {
    lines.push(
      `| ${report.site.label} | ${report.site.category} | ${report.site.radiusKm} | ${report.prospectCount} | ${report.falsePositiveCount} |`
    );
  }

  lines.push('', '## Per-site top-10', '');
  for (const report of params.reports) {
    lines.push(`### ${report.site.label}`, '');
    lines.push(`Address: \`${report.site.address}\` (${report.site.lat.toFixed(5)}, ${report.site.lon.toFixed(5)}), radius **${report.site.radiusKm} km**.`, '');
    if (report.rows.length === 0) {
      lines.push('_No prospects returned._', '');
      continue;
    }
    lines.push(
      '| # | Brand | Verified | ATP km | OSM km | Geotile km | Ground in radius |',
      '|---|-------|----------|--------|--------|------------|------------------|'
    );
    for (const row of report.rows) {
      const gt = row.groundTruth;
      lines.push(
        `| ${row.rank} | ${row.name} | ${row.verified} | ${fmtKm(gt.atpKm)} | ${fmtKm(gt.osmKm)} | ${fmtKm(gt.geotileKm)} | ${gt.inRadius ? 'yes' : 'no'} |`
      );
    }
    lines.push('');
  }

  lines.push(
    '## Fixtures not used for ranked prospects',
    '',
    '- **350 Bleecker St** and **1600 Pearl St, Boulder** have store/OSM coverage fixtures (`scripts/qa/store-coverage-audit.mjs`) but **no recorded Qloo insight fixture** for ranked top-10; see `docs/qa/store-coverage-audit.md` for ATP/OSM mismatch tables.',
    ''
  );

  return lines.join('\n');
}

function fmtKm(km?: number): string {
  return km === undefined ? '—' : km.toFixed(2);
}
