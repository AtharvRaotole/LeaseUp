import type { DemoFixtureId } from './demo-addresses.js';
import type { BrandExplainabilityRecording } from './qloo-explainability.js';
import {
  computeBrandLocalAudienceOverlap,
  type QlooAudienceRow,
} from './qloo-brand-taste-overlap.js';

/**
 * Live Qloo audience recordings (scripts/record-brand-explainability-fixture.mjs), packed by
 * scripts/compact-brand-explainability.mjs into live-audiences.compact.json. This module holds no data:
 * the web/tests entry binds it to the JSON import (brand-explainability-loader.ts), while the worker
 * fetches the same JSON from its ASSETS binding at runtime so it stays out of the worker bundle.
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
export type LiveAudiencesCompact = {
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

export type BrandExplainabilityStore = {
  /**
   * Mean Qloo affinity per audience across all recorded live brands (19 on Oct 24, 2026), the baseline
   * for lift (see `BRAND_AUDIENCE_MIN_PANEL_LIFT`). Audiences missing from a brand's top 50 count as 0.5
   * (Qloo's no-signal value).
   */
  audiencePanelBaseline(): Record<string, number>;
  /** Number of recorded live brands in the lift panel. */
  audiencePanelSize(): number;
  /**
   * Verified brand x local overlap for a demo chip, or null when either live recording is missing.
   * `audiences` may be empty (no verified overlap); the Why card then omits its taste section.
   */
  brandExplainabilityForDemo(
    chip: DemoFixtureId,
    brandEntityId: string,
  ): BrandExplainabilityRecording | null;
  listDemoExplainabilityRecordings(): BrandExplainabilityRecording[];
};

export function createBrandExplainabilityStore(
  compact: LiveAudiencesCompact,
): BrandExplainabilityStore {
  function unpackRows(rows: string): QlooAudienceRow[] {
    if (!rows) return [];
    return rows.split(',').map((cell) => {
      const [index, affinity] = cell.split(':');
      const entry = compact.audiences[Number(index)] ?? '';
      const sep = entry.indexOf('|');
      return {
        entityId: entry.slice(0, sep),
        name: entry.slice(sep + 1),
        affinity: Number(affinity),
      };
    });
  }

  const LOCAL_BY_CHIP: Partial<Record<DemoFixtureId, LocalAudienceRecording>> = Object.fromEntries(
    Object.entries(compact.locals).map(([chip, rec]) => [
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
    Object.entries(compact.brands).map(([brandEntityId, rec]) => [
      brandEntityId,
      {
        brandEntityId,
        brandName: rec.name,
        audiences: unpackRows(rec.rows),
        provenance: { recordedAt: rec.recordedAt, host: rec.host, url: rec.url },
      },
    ]),
  );

  let baselineCache: Record<string, number> | undefined;

  function audiencePanelBaseline(): Record<string, number> {
    if (baselineCache) return baselineCache;
    const panel = Object.values(BRAND_BY_ID);
    const ids = new Set(panel.flatMap((rec) => rec.audiences.map((a) => a.entityId)));
    const baseline: Record<string, number> = {};
    for (const id of ids) {
      let sum = 0;
      for (const rec of panel) sum += rec.audiences.find((a) => a.entityId === id)?.affinity ?? 0.5;
      baseline[id] = panel.length ? sum / panel.length : 0.5;
    }
    baselineCache = baseline;
    return baseline;
  }

  function brandExplainabilityForDemo(
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
        panelBaseline: audiencePanelBaseline(),
      }),
      provenance: {
        recordedAt:
          brand.provenance.recordedAt > local.provenance.recordedAt
            ? brand.provenance.recordedAt
            : local.provenance.recordedAt,
        host: brand.provenance.host,
        note: 'Live Qloo urn:audience insights: brand-only and location-only, intersected, ranked by lift over the recorded brand panel, sensitive categories excluded.',
        brandUrl: brand.provenance.url,
        localUrl: local.provenance.url,
      },
    };
  }

  return {
    audiencePanelBaseline,
    audiencePanelSize: () => Object.keys(BRAND_BY_ID).length,
    brandExplainabilityForDemo,
    listDemoExplainabilityRecordings() {
      const out: BrandExplainabilityRecording[] = [];
      for (const chip of Object.keys(LOCAL_BY_CHIP) as DemoFixtureId[]) {
        for (const brandEntityId of Object.keys(BRAND_BY_ID)) {
          const rec = brandExplainabilityForDemo(chip, brandEntityId);
          if (rec) out.push(rec);
        }
      }
      return out;
    },
  };
}
