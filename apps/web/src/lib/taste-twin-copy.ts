import type { ProspectPack } from '@leaseup/contracts';

export type TasteTwinCopy = { headline: string; markets: string; note: string };

/** Report copy for taste-twin comparables; null when the run had no twin set for this brand.
 * rankedByTwins is true when the run's rankingModel is taste_twins (live non-demo addresses). */
export function tasteTwinCopy(
  prospect: ProspectPack,
  brandName: string,
  rankedByTwins = false
): TasteTwinCopy | null {
  const t = prospect.tasteTwins;
  if (!t || t.of <= 0 || t.twins.length === 0) return null;
  const headline =
    t.presentIn === 0
      ? `${brandName} has no store in any of the ${t.of} test markets whose Qloo taste is closest to this site.`
      : `${brandName} trades in ${t.presentIn} of the ${t.of} test markets whose Qloo taste is closest to this site${
          t.presentSites.length > 0 ? `: ${t.presentSites.join('; ')}` : ''
        }.`;
  return {
    headline,
    markets: `Closest taste markets: ${t.twins.join('; ')}.`,
    note: rankedByTwins
      ? 'From a 40-market panel, over 50 km away. This share is one input to the pitch order on this run.'
      : 'From a 40-market panel, over 50 km away. Evidence only; it does not change the ranking.',
  };
}
