import type { ProspectPack, TasteTwinEvidence } from '@leaseup/contracts';
import panel from './taste-twin-panel.json';

/**
 * Taste-twin comparables. The panel is the recorded 40-address eval (Qloo insights affinity plus store
 * ground truth at the adaptive radius), shipped as a static asset, so this makes no Qloo calls and no
 * KV writes. A site's taste vector is the per-site z-score of Qloo brand affinity minus that brand's
 * panel mean (what is distinctive here, not what is popular everywhere). Twins are the panel sites
 * with the most similar vectors (Pearson), excluding any within 50 km of the site.
 * Evidence only: it adds a reason line and a structured field, never reorders the list.
 * Backtest (data/qloo-eval-40/TASTE_TWIN_EVAL.md): twin share AUC 0.802 vs 0.724 for random panel sites.
 */

type PanelSite = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  radiusKm: number;
  present: number[];
  dev: Array<number | null>;
};
type Panel = {
  k: number;
  excludeKm: number;
  minCommonBrands: number;
  brands: string[];
  brandMeanZ: number[];
  sites: PanelSite[];
};

const PANEL = panel as Panel;
const BRAND_INDEX = new Map(PANEL.brands.map((id, i) => [id, i]));

/** Show the reason line only when most twins carry the brand. */
export const TASTE_TWIN_REASON_MIN = 3;

export type TasteTwin = { id: string; label: string; similarity: number };
export type TasteTwinSet = { twins: TasteTwin[]; commonBrands: number };

type InsightLike = { entity_id: string; query?: { affinity?: number } };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p = Math.PI / 180;
  const h =
    Math.sin(((lat2 - lat1) * p) / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(((lon2 - lon1) * p) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    num += (a[i]! - ma) * (b[i]! - mb);
    da += (a[i]! - ma) ** 2;
    db += (b[i]! - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/** Site taste vector over panel brands, from the insights this run already fetched. */
export function siteTasteVector(insights: InsightLike[]): Map<number, number> {
  const rows: Array<[number, number]> = [];
  for (const insight of insights) {
    const idx = BRAND_INDEX.get(insight.entity_id);
    const affinity = insight.query?.affinity;
    if (idx === undefined || typeof affinity !== 'number' || !Number.isFinite(affinity)) continue;
    rows.push([idx, affinity]);
  }
  const out = new Map<number, number>();
  if (rows.length < 2) return out;
  const mean = rows.reduce((s, [, a]) => s + a, 0) / rows.length;
  const sd = Math.sqrt(rows.reduce((s, [, a]) => s + (a - mean) ** 2, 0) / rows.length);
  if (!(sd > 0)) return out;
  for (const [idx, affinity] of rows) {
    out.set(idx, (affinity - mean) / sd - PANEL.brandMeanZ[idx]!);
  }
  return out;
}

export function findTasteTwins(
  latitude: number,
  longitude: number,
  insights: InsightLike[],
  k: number = PANEL.k
): TasteTwinSet | null {
  const vector = siteTasteVector(insights);
  if (vector.size < PANEL.minCommonBrands) return null;
  const scored: TasteTwin[] = [];
  let commonBrands = 0;
  for (const site of PANEL.sites) {
    if (haversineKm(latitude, longitude, site.lat, site.lon) <= PANEL.excludeKm) continue;
    const a: number[] = [];
    const b: number[] = [];
    for (const [idx, value] of vector) {
      const other = site.dev[idx];
      if (other === null || other === undefined) continue;
      a.push(value);
      b.push(other);
    }
    if (a.length < PANEL.minCommonBrands) continue;
    commonBrands = Math.max(commonBrands, a.length);
    scored.push({ id: site.id, label: site.label, similarity: Math.round(pearson(a, b) * 1000) / 1000 });
  }
  if (scored.length < k) return null;
  scored.sort((x, y) => y.similarity - x.similarity || x.id.localeCompare(y.id));
  return { twins: scored.slice(0, k), commonBrands };
}

export function tasteTwinEvidence(entityId: string, set: TasteTwinSet): TasteTwinEvidence | undefined {
  const idx = BRAND_INDEX.get(entityId);
  if (idx === undefined) return undefined;
  const byId = new Map(PANEL.sites.map((s) => [s.id, s]));
  const presentIn = set.twins
    .filter((t) => byId.get(t.id)?.present.includes(idx))
    .map((t) => t.label);
  return { presentIn: presentIn.length, of: set.twins.length, presentSites: presentIn, twins: set.twins.map((t) => t.label) };
}

export function tasteTwinReason(evidence: TasteTwinEvidence): string | undefined {
  if (evidence.presentIn < TASTE_TWIN_REASON_MIN) return undefined;
  return `Already trades in ${evidence.presentIn} of the ${evidence.of} test markets whose Qloo taste is closest to this site (${evidence.presentSites.join('; ')})`;
}

export function withTasteTwinEvidence(pack: ProspectPack, set: TasteTwinSet | null): ProspectPack {
  if (!set) return pack;
  const evidence = tasteTwinEvidence(pack.brand.entityId, set);
  if (!evidence) return pack;
  const reason = tasteTwinReason(evidence);
  return {
    ...pack,
    tasteTwins: evidence,
    reasons: reason ? [...pack.reasons.slice(0, 2), reason, ...pack.reasons.slice(2)] : pack.reasons,
  };
}
