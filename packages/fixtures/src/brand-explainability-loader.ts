import type { DemoFixtureId } from './demo-addresses.js';
import type { BrandExplainabilityRecording } from './qloo-explainability.js';
import {
  computeBrandLocalAudienceOverlap,
  genericAudienceIdsAtLocation,
  type QlooAudienceRow,
} from './qloo-brand-taste-overlap.js';
import compact from './brand-explainability/live-audiences.compact.json';
import chipBrands from './brand-explainability/chip-brands.json';

/**
 * Live Qloo recordings (scripts/record-brand-explainability-fixture.mjs). No mock or hand-written rows:
 * brand-only and location-only urn:audience insights, intersected at load time. The readable per-call files
 * live in brand-explainability/{brand-audiences,local-audiences}/; scripts/compact-brand-explainability.mjs
 * packs them verbatim into live-audiences.compact.json so the worker bundle stays small.
 */
type BrandAudienceRecording = {
  brandEntityId: string;
  brandName: string;
  audiences: QlooAudienceRow[];
  provenance: { recordedAt: string; host?: string; url?: string };
};

type LocalAudienceRecording = {
  chip: string;
  location: { latitude: number; longitude: number };
  radiusKm: number;
  audiences: QlooAudienceRow[];
  provenance: { recordedAt: string; host?: string; url?: string };
};

type CompactEntry = {
  recordedAt: string;
  host?: string;
  url?: string;
  rows: string;
};
type CompactRecordings = {
  audiences: string[];
  locals: Record<
    string,
    CompactEntry & {
      location: { latitude: number; longitude: number };
      radiusKm: number;
    }
  >;
  brands: Record<string, CompactEntry & { name: string }>;
};

const COMPACT = compact as CompactRecordings;

function unpackRows(rows: string): QlooAudienceRow[] {
  if (!rows) return [];
  return rows.split(',').map((cell) => {
    const [index, affinity] = cell.split(':');
    const entry = COMPACT.audiences[Number(index)] ?? '';
    const sep = entry.indexOf('|');
    return {
      entityId: entry.slice(0, sep),
      name: entry.slice(sep + 1),
      affinity: Number(affinity),
    };
  });
}

const LOCAL_BY_CHIP: Partial<Record<DemoFixtureId, LocalAudienceRecording>> = Object.fromEntries(
  Object.entries(COMPACT.locals).map(([chip, rec]) => [
    chip,
    {
      chip,
      location: rec.location,
      radiusKm: rec.radiusKm,
      audiences: unpackRows(rec.rows),
      provenance: {
        recordedAt: rec.recordedAt,
        host: rec.host,
        url: rec.url,
      },
    },
  ]),
);

const BRAND_BY_ID: Record<string, BrandAudienceRecording> = Object.fromEntries(
  Object.entries(COMPACT.brands).map(([brandEntityId, rec]) => [
    brandEntityId,
    {
      brandEntityId,
      brandName: rec.name,
      audiences: unpackRows(rec.rows),
      provenance: { recordedAt: rec.recordedAt, host: rec.host, url: rec.url },
    },
  ]),
);

/**
 * Mean Qloo affinity per audience across the recorded live brand panel, leaving out `excludeBrandId`.
 * Audiences missing from a brand's top 50 count as 0.5 (Qloo's no-signal value).
 */
const baselineCache = new Map<string, Record<string, number>>();

export function audiencePanelBaseline(excludeBrandId?: string): Record<string, number> {
  const cacheKey = excludeBrandId ?? '';
  const hit = baselineCache.get(cacheKey);
  if (hit) return hit;
  const panel = Object.values(BRAND_BY_ID).filter((rec) => rec.brandEntityId !== excludeBrandId);
  const ids = new Set(panel.flatMap((rec) => rec.audiences.map((a) => a.entityId)));
  const baseline: Record<string, number> = {};
  for (const id of ids) {
    let sum = 0;
    for (const rec of panel) sum += rec.audiences.find((a) => a.entityId === id)?.affinity ?? 0.5;
    baseline[id] = panel.length ? sum / panel.length : 0.5;
  }
  baselineCache.set(cacheKey, baseline);
  return baseline;
}

const CHIP_BRAND_IDS = chipBrands as Partial<Record<DemoFixtureId, string[]>>;

function recordedBrands(ids: string[]): BrandAudienceRecording[] {
  return ids
    .map((id) => BRAND_BY_ID[id])
    .filter((rec): rec is BrandAudienceRecording => Boolean(rec));
}

/**
 * Audiences that pass the overlap gates for more than half of the given recorded brands against
 * `localRows` (default panel: every recorded brand). Used to drop generic audiences per location.
 */
export function genericAudienceIdsForLocation(
  localRows: QlooAudienceRow[],
  brandIds: string[] = Object.keys(BRAND_BY_ID),
): Set<string> {
  return genericAudienceIdsAtLocation(recordedBrands(brandIds), localRows, (id) =>
    audiencePanelBaseline(id),
  );
}

const genericByChip = new Map<DemoFixtureId, Set<string>>();

/** Generic audiences at a demo chip, judged across the brands pitched there. */
export function genericAudienceIdsForDemoChip(chip: DemoFixtureId): Set<string> {
  let cached = genericByChip.get(chip);
  if (!cached) {
    const local = LOCAL_BY_CHIP[chip];
    cached = local
      ? genericAudienceIdsForLocation(local.audiences, CHIP_BRAND_IDS[chip] ?? [])
      : new Set<string>();
    genericByChip.set(chip, cached);
  }
  return cached;
}

/**
 * Verified brand x local overlap for a demo chip, or null when either live recording is missing.
 * `audiences` may be empty (no verified overlap); the Why card then omits its taste section.
 */
export function brandExplainabilityForDemo(
  chip: DemoFixtureId,
  brandEntityId: string,
): BrandExplainabilityRecording | null {
  const local = LOCAL_BY_CHIP[chip];
  const brand = BRAND_BY_ID[brandEntityId];
  if (!local || !brand) return null;
  return {
    chip,
    brandEntityId,
    brandName: brand.brandName,
    location: local.location,
    radiusKm: local.radiusKm,
    tags: [],
    audiences: computeBrandLocalAudienceOverlap(brand.audiences, local.audiences, {
      panelBaseline: audiencePanelBaseline(brandEntityId),
      excludeAudienceIds: genericAudienceIdsForDemoChip(chip),
    }),
    provenance: {
      recordedAt:
        brand.provenance.recordedAt > local.provenance.recordedAt
          ? brand.provenance.recordedAt
          : local.provenance.recordedAt,
      host: brand.provenance.host,
      note: 'Live Qloo urn:audience insights: brand-only and location-only, intersected, panel-lift and distinctiveness filtered.',
      brandUrl: brand.provenance.url,
      localUrl: local.provenance.url,
    },
  };
}

export function listDemoExplainabilityRecordings(): BrandExplainabilityRecording[] {
  const out: BrandExplainabilityRecording[] = [];
  for (const chip of Object.keys(LOCAL_BY_CHIP) as DemoFixtureId[]) {
    for (const brandEntityId of Object.keys(BRAND_BY_ID)) {
      const rec = brandExplainabilityForDemo(chip, brandEntityId);
      if (rec) out.push(rec);
    }
  }
  return out;
}
