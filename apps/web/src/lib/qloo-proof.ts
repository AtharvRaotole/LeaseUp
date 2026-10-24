import type { AnalysisResponse, BacktestResult, BrandRankingRow } from '@leaseup/contracts';
import {
  findDemoAdaptiveProofByAddress,
  findAdaptiveEvalRowByAddress,
  DEMO_ADAPTIVE_PROOF_AGG,
  loadLiveQlooLiftAggregates,
  p10ToCountOf10,
} from '@leaseup/fixtures';
import { displayBrandName } from './brand-display';
import { presentInTop10Count } from './hit-rate';

function productionBacktest(results: AnalysisResponse): BacktestResult {
  return results.backtestBlended ?? results.backtest;
}

function blendAndChainHits(results: AnalysisResponse): {
  blendHits: number;
  chainHits: number;
  fromRecordedEval: boolean;
  adaptiveRadiusKm?: number;
} {
  const recorded =
    findDemoAdaptiveProofByAddress(results.location.address) ??
    findAdaptiveEvalRowByAddress(results.location.address);
  if (recorded) {
    return {
      blendHits: p10ToCountOf10(recorded.p10_blend),
      chainHits: p10ToCountOf10(recorded.p10_chain),
      fromRecordedEval: true,
      adaptiveRadiusKm: recorded.adaptive_radius_km,
    };
  }
  const baseline = results.backtestBaseline;
  const blend = productionBacktest(results);
  return {
    blendHits: presentInTop10Count(blend),
    chainHits: baseline ? presentInTop10Count(baseline) : presentInTop10Count(blend),
    fromRecordedEval: false,
  };
}

/** Broker-facing proof banner (no AUC / CI / jargon in the main lines). */
export function qlooProofBrokerBanner(results: AnalysisResponse): {
  headline: string;
  cohortLine: string;
  tieNote: string | null;
  methodDetail: string;
  caveat: string;
} {
  const { blendHits, chainHits, fromRecordedEval, adaptiveRadiusKm } = blendAndChainHits(results);
  const headline =
    `At this address, LeaseUp's taste-aware ranking put ${blendHits} of its top 10 brands where they already do well, vs ${chainHits} of 10 using store count alone.`;

  const agg = DEMO_ADAPTIVE_PROOF_AGG;
  const cohortLine =
    `Across ${agg.n_sites} US neighborhoods, adding Qloo taste beat store count alone, ${Math.round(agg.p10_blend * 100)}% vs ${Math.round(agg.p10_chain * 100)}%.`;

  let tieNote: string | null = null;
  if (blendHits === chainHits) {
    tieNote =
      fromRecordedEval && adaptiveRadiusKm
        ? `At this pin, taste-aware ranking and store count tie at ${blendHits} of 10 within the ${adaptiveRadiusKm} km eval radius.`
        : `At this pin, taste-aware ranking and store count tie at ${blendHits} of 10 in the trade area.`;
  }

  const recorded =
    findDemoAdaptiveProofByAddress(results.location.address) ??
    findAdaptiveEvalRowByAddress(results.location.address);
  const cohortLegacy = loadLiveQlooLiftAggregates();
  const auc = cohortLegacy.sameSizeAuc;
  const randomExpected =
    recorded && recorded.n_present !== undefined && recorded.n_brands
      ? (10 * recorded.n_present) / recorded.n_brands
      : undefined;
  const methodParts = [
    `Recorded eval uses a density-based radius (e.g. ${adaptiveRadiusKm ?? 1.5} km dense urban).`,
    randomExpected !== undefined
      ? `Random baseline at that radius: ~${randomExpected.toFixed(1)} of 10 present (pool ${recorded!.n_present}/${recorded!.n_brands} in radius).`
      : '',
    `Cohort rank match among similar chains ${(auc.value * 100).toFixed(0)}% (likely range ${(auc.ciLow * 100).toFixed(0)}% to ${(auc.ciHigh * 100).toFixed(0)}%).`,
    `Mean top-10 presence: raw Qloo ${(agg.p10_raw * 100).toFixed(0)}%, chain size ${(agg.p10_chain * 100).toFixed(0)}%, taste-aware blend ${(agg.p10_blend * 100).toFixed(0)}%.`,
  ];
  if (recorded?.same_size_auc !== undefined && recorded.same_size_auc_ci) {
    methodParts.push(
      `This pin rank match ${(recorded.same_size_auc * 100).toFixed(0)}% (likely range ${(recorded.same_size_auc_ci[0] * 100).toFixed(0)}% to ${(recorded.same_size_auc_ci[1] * 100).toFixed(0)}%).`
    );
  }
  if (recorded?.p10_raw !== undefined) {
    methodParts.push(
      `Raw Qloo order at this pin: ${p10ToCountOf10(recorded.p10_raw)} of 10 (does not beat chain size alone).`
    );
  }
  const methodDetail = methodParts.join(' ');
  const caveat =
    'Qloo taste may partly reflect brands that already operate nearby; use absence checks on the pitch list.';

  return { headline, cohortLine, tieNote, methodDetail, caveat };
}

/** @deprecated use qlooProofBrokerBanner for UI */
export function qlooEvalHeadlineParts(): {
  headline: string;
  companion: string;
  caveat: string;
} {
  const agg = DEMO_ADAPTIVE_PROOF_AGG;
  const auc = agg.same_size_auc;
  const headline =
    `Among brands with a similar national footprint, Qloo ranks chains that already operate here ahead of absent ones about two-thirds of the time ` +
    `(same-size AUC ${auc.toFixed(2)}, 95% CI ${agg.same_size_auc_ci[0].toFixed(2)} to ${agg.same_size_auc_ci[1].toFixed(2)}).`;
  const companion =
    `Taste-aware blend ${(agg.p10_blend * 100).toFixed(0)}% top-10 presence vs ${(agg.p10_chain * 100).toFixed(0)}% for chain size alone on ${agg.n_sites} recorded sites.`;
  const caveat =
    'Qloo taste may partly reflect brands that already operate in the trade area; read lift alongside store absence checks.';
  return { headline, companion, caveat };
}

export function qlooEvalHeadlineCopy(): string {
  const { headline, companion, caveat } = qlooEvalHeadlineParts();
  return `${headline} ${companion} ${caveat}`;
}

export function qlooProofEvalLead(results: AnalysisResponse): ReturnType<typeof qlooProofBrokerBanner> {
  return qlooProofBrokerBanner(results);
}

export function qlooProofSentence(
  qlooBacktest: BacktestResult,
  baselineBacktest: BacktestResult
): string {
  const withoutTaste = presentInTop10Count(baselineBacktest);
  const withTaste = presentInTop10Count(qlooBacktest);
  return `Taste-aware ranking: ${withTaste} of 10 top picks already have a store nearby. Store count only: ${withoutTaste} of 10.`;
}

export function qlooProofSentenceTechnical(
  qlooBacktest: BacktestResult,
  baselineBacktest: BacktestResult
): string {
  const withoutTaste = presentInTop10Count(baselineBacktest);
  const withQloo = presentInTop10Count(qlooBacktest);
  return `Blend order: ${withQloo} of 10. Chain-size order: ${withoutTaste} of 10.`;
}

export function qlooProofWinner(
  qlooBacktest: BacktestResult,
  baselineBacktest: BacktestResult
): 'qloo' | 'baseline' | 'tie' {
  const q = presentInTop10Count(qlooBacktest);
  const b = presentInTop10Count(baselineBacktest);
  if (q > b) return 'qloo';
  if (b > q) return 'baseline';
  return 'tie';
}

export function rankMovementLabel(qlooRank: number, baselineRank: number): string {
  const delta = baselineRank - qlooRank;
  if (delta > 0) return `+${delta} with taste`;
  if (delta < 0) return `${delta} with taste`;
  return 'Same';
}

export function rankMovementLabelTechnical(qlooRank: number, baselineRank: number): string {
  const delta = baselineRank - qlooRank;
  if (delta > 0) return `Up ${delta} with Qloo`;
  if (delta < 0) return `Down ${Math.abs(delta)} with Qloo`;
  return 'Same rank';
}

function topRankMovers(rankings: BrandRankingRow[], take = 3): BrandRankingRow[] {
  return rankings
    .filter(
      (row) =>
        row.baselineRank !== undefined &&
        row.blendedRank !== row.baselineRank &&
        (row.blendedRank <= 10 || row.baselineRank <= 10)
    )
    .sort((a, b) => {
      const deltaA = Math.abs((a.baselineRank ?? a.blendedRank) - a.blendedRank);
      const deltaB = Math.abs((b.baselineRank ?? b.blendedRank) - b.blendedRank);
      if (deltaB !== deltaA) return deltaB - deltaA;
      return Math.min(a.blendedRank, a.baselineRank ?? a.blendedRank) -
        Math.min(b.blendedRank, b.baselineRank ?? b.blendedRank);
    })
    .slice(0, take);
}

export function qlooProofTieDetail(rankings: BrandRankingRow[] | undefined): string | null {
  if (!rankings?.length) return null;
  const movers = topRankMovers(rankings, 3);
  if (movers.length === 0) {
    return 'Same nearby-store count and the top 10 list matches chain-size order.';
  }
  const parts = movers.map((row) => {
    const name = displayBrandName(row.entityId, row.name);
    return `${name} (LeaseUp #${row.blendedRank} vs chain size #${row.baselineRank ?? row.blendedRank})`;
  });
  return `Same nearby-store count, but taste changes who makes the top 10 (e.g. ${parts.join('; ')}).`;
}

export function qlooProofTieDetailTechnical(rankings: BrandRankingRow[] | undefined): string | null {
  if (!rankings?.length) return null;
  const movers = topRankMovers(rankings, 3);
  if (movers.length === 0) {
    return 'Same hit count and the top 10 brand list matches chain-size order.';
  }
  const parts = movers.map((row) => {
    const name = displayBrandName(row.entityId, row.name);
    return `${name} (#${row.blendedRank} blend vs #${row.baselineRank ?? row.blendedRank} chain size)`;
  });
  return `Same hit count; Qloo reshuffles who makes the top 10 (e.g. ${parts.join('; ')}).`;
}

export function qlooProofHitRateTieSubtitle(
  rankings: BrandRankingRow[] | undefined
): string | null {
  const detail = qlooProofTieDetail(rankings);
  if (!detail) return 'Tied on nearby-store match; taste still changes order.';
  return detail;
}
