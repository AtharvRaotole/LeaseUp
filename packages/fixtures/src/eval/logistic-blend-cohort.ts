import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { orderInsightsByLogisticBlend, type LogisticBlendSiteContext } from '../logistic-blend.js';
const RNG_SEED = 20261023;

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function precisionAt10(score: number[], present: number[], reps = 50): number {
  const rand = mulberry32(RNG_SEED);
  const vals: number[] = [];
  for (let r = 0; r < reps; r++) {
    const order = score
      .map((s, i) => ({ s, i, tie: rand() }))
      .sort((a, b) => b.s - a.s || b.tie - a.tie);
    const top = order.slice(0, 10);
    const hits = top.reduce((sum, row) => sum + (present[row.i] ? 1 : 0), 0);
    vals.push(hits / 10);
  }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

type EvalTables = {
  ground_truth: {
    national_count: Record<string, number>;
    addresses: Record<
      string,
      {
        radius_km: number;
        density_3km: number;
        tier: LogisticBlendSiteContext['tier'];
        brands: Record<string, { nearest_km: number }>;
      }
    >;
  };
  insights: Record<string, Record<string, { affinity: number | null }>>;
};

function evalDataRoot(): string {
  const candidates = [
    join(process.cwd(), 'data/qloo-eval-40'),
    join(process.cwd(), '../../data/qloo-eval-40'),
  ];
  for (const path of candidates) {
    try {
      readFileSync(join(path, 'ground_truth.json'));
      return path;
    } catch {
      /* try next */
    }
  }
  return candidates[0]!;
}

export function loadEvalTablesFromRepo(): EvalTables {
  const root = evalDataRoot();
  const ground_truth = JSON.parse(readFileSync(join(root, 'ground_truth.json'), 'utf8'));
  const insights = JSON.parse(readFileSync(join(root, 'insights_affinity.json'), 'utf8'));
  return { ground_truth, insights };
}

export function cohortLogisticBlendMeanP10(tables = loadEvalTablesFromRepo()): number {
  const { ground_truth: gt, insights: ins } = tables;
  const counts = gt.national_count;
  const p10s: number[] = [];

  for (const [aid, ga] of Object.entries(gt.addresses)) {
    const site: LogisticBlendSiteContext = {
      radiusKm: ga.radius_km,
      density3km: ga.density_3km,
      tier: ga.tier,
    };
    const brands = Object.keys(ins[aid] ?? {}).filter(
      (b) => b in counts && ins[aid]![b]!.affinity != null
    );
    const insightRows = brands
      .map((entity_id) => ({
        entity_id,
        name: entity_id,
        query: { affinity: ins[aid]![entity_id]!.affinity! },
      }))
      .sort((a, b) => (b.query!.affinity ?? 0) - (a.query!.affinity ?? 0));

    const ordered = orderInsightsByLogisticBlend(insightRows, site);
    const scoreById = new Map(
      ordered.map((row) => [row.entity_id, ordered.length - row.blendedRank + 1])
    );
    const scores = brands.map((b) => scoreById.get(b) ?? 0);
    const present = brands.map((b) => (ga.brands[b]?.nearest_km ?? 999) <= ga.radius_km ? 1 : 0);
    p10s.push(precisionAt10(scores, present));
  }

  return p10s.reduce((a, b) => a + b, 0) / p10s.length;
}
