import type { ProspectPack } from '@leaseup/contracts';
import type { BacktestResult } from '@leaseup/contracts';
import { DEMO_ADAPTIVE_PROOF_AGG } from '@leaseup/fixtures';
import { presentInTop10Count } from './hit-rate';

const RANKING_EVAL_BLEND_PCT = Math.round(DEMO_ADAPTIVE_PROOF_AGG.p10_blend * 100);
const RANKING_EVAL_CHAIN_PCT = Math.round(DEMO_ADAPTIVE_PROOF_AGG.p10_chain * 100);
const RANKING_EVAL_SITE_COUNT = DEMO_ADAPTIVE_PROOF_AGG.n_sites;

/** Plain-English line shown on landing and at the top of every report. */
export const REPORT_PLAIN_SUMMARY =
  'These are brands your neighborhood shoppers love that do not have a store nearby yet.';

export const LANDING_HEADLINE = 'Find the right stores for your empty retail space.';

export const LANDING_ADDRESS_PLACEHOLDER = 'Street address';

export const LANDING_PLAIN_SUMMARY =
  'Type in an address. LeaseUp shows which brands people nearby love but can\'t find close by, and helps you pitch them.';

export function tradeAreaLabel(radiusKm: number): string {
  return `${radiusKm} km area`;
}

export function tradeAreaTooltip(radiusKm: number): string {
  return `We look for existing stores within ${radiusKm} km of your pin.`;
}

export function rankingBacktestStatLabel(backtest: BacktestResult): string {
  return `${presentInTop10Count(backtest)} of 10`;
}

export function rankingBacktestStatSubtitle(): string {
  return 'Top-ranked brands that already have a store in this area';
}

export function rankingBacktestStatTooltip(absenceKm: number): string {
  return `Ranking backtest only: of the top 10 taste-ranked brands, how many already have a store within ${absenceKm} km. This is separate from your pitch list below.`;
}

/** @deprecated use rankingBacktestStatLabel */
export function alreadyNearbyStatLabel(backtest: BacktestResult): string {
  return rankingBacktestStatLabel(backtest);
}

/** @deprecated use rankingBacktestStatTooltip */
export function alreadyNearbyStatTooltip(radiusKm: number): string {
  return rankingBacktestStatTooltip(radiusKm);
}

export function brandsScoredStatTooltip(): string {
  return 'How many major chains we scored for local shopper taste at this address.';
}

/** Plain line when a taste tag or audience stands out in the trade area. */
export function shopperInterestHighlight(interest: string): string {
  return `People near this site shop more for ${interest} than in a typical neighborhood`;
}

/** One-line form of a verified Qloo brand x local audience overlap (see whyBrandTaste). */
export function audienceOverlapHighlight(audience: string): string {
  return `Qloo's ${audience} audience ranks high for this brand and near this site`;
}

export function dataConfidenceStatTooltip(): string {
  return 'How sure we are about the address pin and how deep the brand ranking is.';
}

export function localFitTooltip(): string {
  return 'How strongly local shoppers favor this brand compared with other chains we scored.';
}

export function localShopperMatchTooltip(): string {
  return 'How this brand ranks for local shopper demand among chains of similar size at this address.';
}

export function separationScorePlainTooltip(): string {
  return 'How often a brand with a store nearby ranks above one without. 1.0 means the list lines up with stores on the ground.';
}

export function methodologyDensityRadiusTooltip(): string {
  return 'In busy areas we use a smaller store search circle so a nearby chain counts as present.';
}

export function methodologyTop10HitTooltip(): string {
  return 'Of the top 10 brands on the list, how many already had a store inside the search circle.';
}

export function methodologyRankMatchTooltip(): string {
  return 'How often taste ranking puts brands with a real store ahead of brands without one, among chains of similar size.';
}

export function methodologyTasteRankTooltip(): string {
  return 'Where this site sits in local shopper taste compared with other chains of similar size (higher is stronger).';
}

export function methodologyLikelyRangeTooltip(): string {
  return 'The range we expect this score to fall in if we repeated the study on similar addresses.';
}

export function methodologyCatalogMetricTooltip(metricId: string, description?: string): string {
  switch (metricId) {
    case 'same_size_auc':
      return methodologyRankMatchTooltip();
    case 'legacy_present_at10':
      return `${methodologyTop10HitTooltip()} Uses your full search radius.`;
    case 'adaptive_present_at10':
      return `${methodologyTop10HitTooltip()} Uses a tighter circle in busy trade areas.`;
    case 'spearman_presence':
      return 'How closely rank order lines up with which brands already have a store in the circle.';
    case 'surprise_present_at10':
      return 'Present brands ranked high by taste but not by national chain size alone.';
    case 'random_monte_carlo':
      return 'Average top-10 hits if we shuffled the brand list at random.';
    default:
      return description ?? 'How this metric is scored on the recorded site list.';
  }
}

export function verificationBrokerLabel(verified: ProspectPack['brand']['verified']): string {
  switch (verified) {
    case 'verified (2 sources)':
      return 'Confirmed open';
    case 'verifying...':
      return 'Checking map';
    case 'unverified (1 source)':
      return 'One source only';
    case 'conflict - likely present':
      return 'Likely open';
    case 'conflict':
      return 'Sources disagree';
    case 'unverified':
      return 'Not confirmed';
    default:
      return 'Not confirmed';
  }
}

export function verificationBrokerTooltip(
  verified: ProspectPack['brand']['verified'],
  radiusKm: number,
  osmSnapshotLabel?: string
): string {
  const osmLabel = osmSnapshotLabel ?? 'OpenStreetMap';
  switch (verified) {
    case 'verified (2 sources)':
      return `No matching store in All The Places or ${osmLabel} within ${radiusKm} km.`;
    case 'verifying...':
      return `We are checking ${osmLabel} for a second source.`;
    case 'unverified (1 source)':
      return `Only one database shows a store within ${radiusKm} km. Treat as a lead, not proof of absence.`;
    case 'conflict - likely present':
    case 'conflict':
      return `Our sources disagree about a store within ${radiusKm} km.`;
    case 'unverified':
      return `We could not confirm a store in either source within ${radiusKm} km.`;
    default:
      return `Store check within ${radiusKm} km.`;
  }
}

export function demoChipProofLabel(presentInTop10: number, tiedNote?: string): string {
  const base = `${presentInTop10} of 10 already nearby`;
  return tiedNote ? `${base} (${tiedNote})` : base;
}

export function proofSectionLead(present: number, radiusKm: number): string {
  return `${present} of the top 10 taste picks already have a store within ${radiusKm} km.`;
}

export function rankingModeExplainerSentence(mode: 'qloo' | 'baseline'): string {
  if (mode === 'baseline') {
    return `Ranked by national chain size only, without the local taste blend. In our ${RANKING_EVAL_SITE_COUNT}-neighborhood test, ${RANKING_EVAL_CHAIN_PCT}% of top-10 picks already had a store in similar areas.`;
  }
  return `Ranked by local taste plus chain size. In our ${RANKING_EVAL_SITE_COUNT}-neighborhood test, ${RANKING_EVAL_BLEND_PCT}% of top-10 picks already had a store in similar areas, vs ${RANKING_EVAL_CHAIN_PCT}% using chain size alone.`;
}

export function rankingModeTooltip(mode: 'qloo' | 'baseline'): string {
  return rankingModeExplainerSentence(mode);
}

export function tasteHeatMapTooltip(): string {
  return 'Shows where shoppers who love this brand tend to live or shop nearby.';
}

export function movementColumnTooltip(): string {
  return 'How far this brand moved when we add local taste instead of chain size alone.';
}

export function storeNearbyColumnTooltip(radiusKm: number): string {
  return `Whether this brand already has a store within ${radiusKm} km.`;
}

export const REPORT_TOUR_STORAGE_KEY = 'leaseup-report-guided-tour-v1';
