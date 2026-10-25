import type { BacktestResult, Location } from '@leaseup/contracts';
import type { QlooLocation } from '../providers/qloo';

/** Human label for the taste / Qloo step (avoid raw lat/lon when geocode has a neighborhood). */
export function tasteLocationLabel(location: Location, qloo: QlooLocation): string {
  if (qloo.kind === 'query') return qloo.query;
  const neighborhood = location.neighborhood?.trim();
  if (neighborhood) return neighborhood;
  const city = location.city?.trim();
  if (city) return city;
  return `${qloo.latitude.toFixed(4)}, ${qloo.longitude.toFixed(4)}`;
}

export function formatBacktestStepSummary(input: {
  adaptiveRadiusKm: number;
  raw: BacktestResult;
  blended: BacktestResult;
  randomExpectedPresentAt10: number;
  /** Number of taste twins in the live order (0 or undefined: standard logistic blend). */
  tasteTwinCount?: number;
}): { summary: string; detail: Record<string, number> } {
  const rawN = input.raw.presentInTop10 ?? Math.round(input.raw.precisionAt10 * 10);
  const blendN = input.blended.presentInTop10 ?? Math.round(input.blended.precisionAt10 * 10);
  const randomN = input.randomExpectedPresentAt10;
  const twins = input.tasteTwinCount ?? 0;
  const summary =
    `Adaptive ${input.adaptiveRadiusKm} km · raw ${rawN}/10 · blend ${blendN}/10 · random ~${randomN.toFixed(1)}/10` +
    (twins > 0 ? ` · blend uses ${twins} taste twins` : '');
  return {
    summary,
    detail: {
      adaptiveRadiusKm: input.adaptiveRadiusKm,
      rawPresentInTop10: rawN,
      blendedPresentInTop10: blendN,
      randomExpectedPresentAt10: randomN,
      rawPrecisionAt10: input.raw.precisionAt10,
      blendedPrecisionAt10: input.blended.precisionAt10,
      ...(twins > 0 ? { tasteTwinCount: twins } : {}),
    },
  };
}
