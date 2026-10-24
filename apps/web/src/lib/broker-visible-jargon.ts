/**
 * Raw terms brokers should not see without a plain label plus InfoTooltip/InfoPopover.
 * Used by e2e and unit tests.
 */
export const BROKER_RAW_JARGON_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: 'auc', pattern: /\bAUC\b/ },
  { id: 'p-at-10', pattern: /P@10/ },
  { id: 'percentile', pattern: /\bpercentile\b/i },
  { id: 'taste-fit', pattern: /taste fit/i },
  { id: 'chain-size-tier', pattern: /chain[- ]size tier/i },
  { id: 'confidence-interval', pattern: /confidence interval/i },
  { id: 'ci-95', pattern: /\b95%\s*CI\b/ },
  { id: 'density-radius', pattern: /density[- ]tightened|density radius/i },
  { id: 'verified-label', pattern: /\bVerified\b/ },
  { id: 'unverified-label', pattern: /\bUnverified\b/ },
  { id: 'osm-acronym', pattern: /\bOSM\b/ },
];

export function findBrokerJargonViolations(text: string): string[] {
  const hits: string[] = [];
  for (const { id, pattern } of BROKER_RAW_JARGON_PATTERNS) {
    if (pattern.test(text)) hits.push(id);
  }
  return hits;
}
