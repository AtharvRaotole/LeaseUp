import type { DemoFixtureId } from './demo-addresses.js';
import { demoAdaptiveProofRow } from './demo-adaptive-proof.js';
import { getEvalManifest } from './eval/present-metrics.js';

export type DemoStrictEvalSnapshot = {
  manifestId: string;
  headlineMetricId: string | null;
  dataSource: string;
  searchRadiusKm: number;
  adaptiveRadiusKm: number;
  density: 'urban' | 'suburban' | 'exurban' | 'tourist';
  poolSize: number;
  panels: Array<{
    id: string;
    label: string;
    qloo?: number;
    chain?: number;
    winner?: string;
    randomExpected?: number;
    randomMonteCarlo?: number;
  }>;
  notes: string[];
};

export type DemoBacktestResult = {
  totalStores: number;
  predictedStores: number;
  accuracy: number;
  precisionAt10: number;
  presentInTop10?: number;
  auc?: number;
  examples: Array<{
    name: string;
    distance: number;
    rank: number;
    predicted: boolean;
  }>;
};

function backtestFromProof(
  fixtureId: DemoFixtureId,
  variant: 'raw' | 'blended' | 'baseline'
): DemoBacktestResult {
  const row = demoAdaptiveProofRow(fixtureId);
  const precision =
    variant === 'blended' ? row.p10_blend : variant === 'baseline' ? row.p10_chain : row.p10_raw;
  const present = Math.round(precision * 10);
  return {
    totalStores: row.n_present,
    predictedStores: present,
    accuracy: precision,
    precisionAt10: precision,
    presentInTop10: present,
    auc: row.same_size_auc,
    examples: [],
  };
}

export function demoAnalyzeBacktests(fixtureId: DemoFixtureId): {
  raw: DemoBacktestResult;
  blended: DemoBacktestResult;
  baseline: DemoBacktestResult;
} {
  return {
    raw: backtestFromProof(fixtureId, 'raw'),
    blended: backtestFromProof(fixtureId, 'blended'),
    baseline: backtestFromProof(fixtureId, 'baseline'),
  };
}

export function demoAnalyzeStrictEval(
  fixtureId: DemoFixtureId,
  searchRadiusKm = 10
): DemoStrictEvalSnapshot {
  const row = demoAdaptiveProofRow(fixtureId);
  const manifest = getEvalManifest();
  const blendPresent = Math.round(row.p10_blend * 10);
  const chainPresent = Math.round(row.p10_chain * 10);
  const qlooPresent = Math.round(row.p10_raw * 10);
  const density =
    row.stratum === 'dense_urban' || row.stratum === 'urban'
      ? 'urban'
      : row.stratum === 'tourist'
        ? 'tourist'
        : row.stratum === 'exurban'
          ? 'exurban'
          : 'suburban';

  return {
    manifestId: manifest.id,
    headlineMetricId: manifest.headlineMetricId,
    dataSource: manifest.dataSource,
    searchRadiusKm,
    adaptiveRadiusKm: row.adaptive_radius_km,
    density,
    poolSize: row.n_brands,
    panels: [
      {
        id: 'adaptive_present_at_10',
        label: 'Adaptive present in top 10',
        qloo: qlooPresent,
        chain: chainPresent,
        winner: blendPresent >= chainPresent ? 'qloo' : 'chain',
      },
      {
        id: 'logistic_blend_present_at_10',
        label: 'Logistic blend present in top 10',
        qloo: blendPresent,
        chain: chainPresent,
        winner: blendPresent >= chainPresent ? 'qloo' : 'chain',
      },
      {
        id: 'random_monte_carlo',
        label: 'Random ranking baseline',
        randomExpected: (10 * row.n_present) / row.n_brands,
      },
    ],
    notes: [
      `Recorded 40-site adaptive eval: logistic blend P@10 ${(row.p10_blend * 100).toFixed(0)}% vs chain ${(row.p10_chain * 100).toFixed(0)}% at this pin.`,
    ],
  };
}
