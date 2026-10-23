import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { displayBrandName } from './brand-display';
import { tasteFitMatchHerePhrase } from './fit-display';
import { absenceVerificationSummary } from './absence-verification-copy';
import { formatTradeAreaTasteRow } from './trade-area-taste-copy';
import { shopperInterestHighlight } from './broker-copy';
import { brandReachPlainLine } from './brand-reach-copy';

export function whyBrandBulletLines(
  prospect: ProspectPack,
  results: AnalysisResponse,
  radiusKm: number
): string[] {
  const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
  const total = results.rankings?.length ?? 0;
  const rank = prospect.brand.affinityRank;
  const tasteLine = tasteFitMatchHerePhrase(
    rank,
    total || rank,
    prospect.brand.tasteFitBeyondChainPercentile
  );

  const lines: string[] = [];
  if (total > 0) {
    lines.push(
      tasteLine
        ? `#${rank} of ${total} brands we scored. ${tasteLine}.`
        : `#${rank} of ${total} brands we scored for local shopper taste.`
    );
  } else if (tasteLine) {
    lines.push(`${tasteLine} for ${name}.`);
  } else {
    lines.push(`Strong local shopper match for ${name}.`);
  }

  if (prospect.nearestExistingStoreKm !== undefined) {
    lines.push(`Nearest ${name} is ${prospect.nearestExistingStoreKm.toFixed(1)} km away.`);
  } else {
    lines.push(absenceVerificationSummary(prospect, radiusKm, results));
  }

  const taste = prospect.tradeAreaTaste;
  if (taste?.tags?.length) {
    const labels = taste.tags.map((t) => t.name?.trim() || formatTradeAreaTasteRow(t));
    lines.push(
      `Interests that stand out near this site for ${name}: ${labels.join('; ')}.`
    );
  }
  if (taste?.audiences?.length) {
    const labels = taste.audiences.map((a) => a.name?.trim() || formatTradeAreaTasteRow(a));
    const first = labels[0];
    if (first) {
      lines.push(shopperInterestHighlight(first));
    }
    if (labels.length > 1) {
      lines.push(`Other shopper groups that stand out: ${labels.slice(1).join('; ')}.`);
    }
  }

  if (prospect.brandReach) {
    lines.push(brandReachPlainLine(prospect.brandReach));
  }

  return lines;
}
