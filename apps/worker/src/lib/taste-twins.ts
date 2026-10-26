import type { ProspectPack, TasteTwinEvidence } from '@leaseup/contracts';
import panel from './taste-twin-panel.json';

/**
 * Taste-twin comparables. The panel is the recorded 40-address eval (Qloo insights affinity plus store
 * ground truth at the adaptive radius), shipped as a static asset, so this makes no Qloo calls and no
 * KV writes. A site's taste vector is the z-score of Qloo brand affinity over the brands this run scored,
 * minus each brand's panel mean over that same subset (what is distinctive here, not what is popular
 * everywhere). Twins are the panel sites with the most similar vectors (Pearson), excluding any within
 * 50 km of the site. Twin presence share feeds the live ranking (twin-rank.ts) and a reason line.
 * Backtests: data/qloo-eval-40/TASTE_TWIN_EVAL.md and TWIN_RANK_EVAL.md.
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

/** Panel brand indexes and affinities for this run's insights (first row wins on duplicates). */
function siteRows(insights: InsightLike[]): Array<[number, number]> {
  const rows: Array<[number, number]> = [];
  const seen = new Set<number>();
  for (const insight of insights) {
    const idx = BRAND_INDEX.get(insight.entity_id);
    const affinity = insight.query?.affinity;
    if (idx === undefined || seen.has(idx) || typeof affinity !== 'number' || !Number.isFinite(affinity)) continue;
    seen.add(idx);
    rows.push([idx, affinity]);
  }
  return rows;
}

function zScore(values: number[]): number[] | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length);
  if (!(sd > 0)) return null;
  return values.map((x) => (x - mean) / (sd + 1e-12));
}

/** A panel site's z over a brand subset (null where the site has no affinity for that brand). */
function panelZOver(site: PanelSite, idxs: number[]): Array<number | null> {
  const present: number[] = [];
  const vals: number[] = [];
  idxs.forEach((idx, j) => {
    const dev = site.dev[idx];
    if (dev === null || dev === undefined) return;
    present.push(j);
    vals.push(dev + PANEL.brandMeanZ[idx]!);
  });
  const out: Array<number | null> = idxs.map(() => null);
  const z = zScore(vals);
  if (!z) return out;
  present.forEach((j, k) => {
    out[j] = z[k]!;
  });
  return out;
}

/**
 * Site taste vector over the panel brands this run scored. Every panel site is z-scored over the same
 * brand subset, so a run that only ranked its top 50 brands (live prospecting) is compared like for
 * like. Before Oct 26 the site was z-scored over its top 50 while panel sites used all ~224 brands,
 * which matched dense urban sites with rural towns (data/qloo-eval-40/TWIN_RANK_EVAL.md).
 */
export function siteTasteVector(
  insights: InsightLike[],
  options: { excludePanelIds?: ReadonlySet<string> } = {}
): { vector: Map<number, number>; panel: Map<string, Array<number | null>>; idxs: number[] } {
  const rows = siteRows(insights);
  const idxs = rows.map(([idx]) => idx);
  const empty = { vector: new Map<number, number>(), panel: new Map<string, Array<number | null>>(), idxs };
  const z = zScore(rows.map(([, a]) => a));
  if (!z) return empty;
  const panelZ = new Map<string, Array<number | null>>();
  for (const site of PANEL.sites) panelZ.set(site.id, panelZOver(site, idxs));
  const sums = idxs.map(() => 0);
  const counts = idxs.map(() => 0);
  for (const [id, values] of panelZ) {
    if (options.excludePanelIds?.has(id)) continue;
    values.forEach((v, j) => {
      if (v === null) return;
      sums[j] = (sums[j] ?? 0) + v;
      counts[j] = (counts[j] ?? 0) + 1;
    });
  }
  const mean = sums.map((s, j) => (counts[j]! > 0 ? s / counts[j]! : null));
  const vector = new Map<number, number>();
  const panel = new Map<string, Array<number | null>>();
  idxs.forEach((idx, j) => {
    if (mean[j] !== null) vector.set(idx, z[j]! - mean[j]!);
  });
  for (const [id, values] of panelZ) {
    panel.set(
      id,
      values.map((v, j) => (v === null || mean[j] === null ? null : v - mean[j]!))
    );
  }
  return { vector, panel, idxs };
}

export function findTasteTwins(
  latitude: number,
  longitude: number,
  insights: InsightLike[],
  k: number = PANEL.k,
  options: { excludePanelIds?: ReadonlySet<string> } = {}
): TasteTwinSet | null {
  const { vector, panel, idxs } = siteTasteVector(insights, options);
  if (vector.size < PANEL.minCommonBrands) return null;
  const scored: TasteTwin[] = [];
  let commonBrands = 0;
  for (const site of PANEL.sites) {
    if (options.excludePanelIds?.has(site.id)) continue;
    if (haversineKm(latitude, longitude, site.lat, site.lon) <= PANEL.excludeKm) continue;
    const ref = panel.get(site.id)!;
    const a: number[] = [];
    const b: number[] = [];
    idxs.forEach((idx, j) => {
      const value = vector.get(idx);
      const other = ref[j];
      if (value === undefined || other === null || other === undefined) return;
      a.push(value);
      b.push(other);
    });
    if (a.length < PANEL.minCommonBrands) continue;
    commonBrands = Math.max(commonBrands, a.length);
    scored.push({ id: site.id, label: site.label, similarity: Math.round(pearson(a, b) * 1000) / 1000 });
  }
  if (scored.length < k) return null;
  scored.sort((x, y) => y.similarity - x.similarity || x.id.localeCompare(y.id));
  return { twins: scored.slice(0, k), commonBrands };
}

/** Share of the twins with a store inside their adaptive radius, per brand; undefined outside the panel. */
export function twinPresenceShare(entityId: string, set: TasteTwinSet): number | undefined {
  const idx = BRAND_INDEX.get(entityId);
  if (idx === undefined || set.twins.length === 0) return undefined;
  const byId = new Map(PANEL.sites.map((s) => [s.id, s]));
  const present = set.twins.filter((t) => byId.get(t.id)?.present.includes(idx)).length;
  return present / set.twins.length;
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

/**
 * Share of panel test markets more than 50 km from the site with a store for the brand inside their
 * adaptive radius (the panel base rate the review compares). Undefined outside the panel.
 */
export function panelMarketShare(entityId: string, latitude: number, longitude: number): number | undefined {
  const idx = BRAND_INDEX.get(entityId);
  if (idx === undefined) return undefined;
  const far = PANEL.sites.filter(
    (s) => haversineKm(latitude, longitude, s.lat, s.lon) > PANEL.excludeKm
  );
  if (far.length === 0) return undefined;
  return far.filter((s) => s.present.includes(idx)).length / far.length;
}
