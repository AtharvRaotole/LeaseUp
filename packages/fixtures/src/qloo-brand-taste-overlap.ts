import type { TradeAreaTasteRow } from './qloo-explainability.js';

export type TradeAreaTasteContext = {
  tags: TradeAreaTasteRow[];
  audiences: TradeAreaTasteRow[];
};

export type BrandTasteOverlapSignal = {
  kind: 'tag' | 'audience';
  name: string;
  affinity: number;
  affinityRank: number;
};

function rowScore(row: { affinity: number; affinityRank: number }): number {
  const rank = row.affinityRank;
  if (typeof rank === 'number' && rank > 0) return rank;
  return row.affinity;
}

function toSignal(kind: 'tag' | 'audience', row: TradeAreaTasteRow): BrandTasteOverlapSignal {
  return {
    kind,
    name: row.name.trim(),
    affinity: row.affinity,
    affinityRank: row.affinityRank,
  };
}

/** Top local tags/audiences that overlap the brand audience (from Qloo explainability). */
export function topBrandTasteOverlapSignals(
  taste: TradeAreaTasteContext | undefined,
  take = 3
): BrandTasteOverlapSignal[] {
  if (!taste) return [];

  const merged: BrandTasteOverlapSignal[] = [
    ...taste.tags.map((row) => toSignal('tag', row)),
    ...taste.audiences.map((row) => toSignal('audience', row)),
  ].filter((row) => row.name.length > 0 && row.affinity > 0);

  merged.sort((a, b) => rowScore(b) - rowScore(a));
  return merged.slice(0, take);
}

export function formatBrandTasteOverlapLine(signal: BrandTasteOverlapSignal): string {
  const kindLabel = signal.kind === 'tag' ? 'Taste tag' : 'Audience';
  const rank =
    signal.affinityRank > 0 && signal.affinityRank <= 1
      ? `local lift rank ${signal.affinityRank.toFixed(2)}`
      : `affinity ${(signal.affinity * 100).toFixed(1)}%`;
  return `${kindLabel}: ${signal.name} (${rank})`;
}

/** Deterministic 1 to 2 sentences for demo mode (no model). */
export function deterministicWhyBrandTasteSummary(
  brandName: string,
  signals: BrandTasteOverlapSignal[]
): string {
  if (signals.length === 0) return '';
  const names = signals.map((s) => s.name);
  if (names.length === 1) {
    return `Qloo links ${brandName} to strong local interest in ${names[0]} near this pin.`;
  }
  const lead = names.slice(0, 2).join(' and ');
  const tail = names.length > 2 ? `, plus ${names[2]}` : '';
  return `Qloo ties ${brandName} to local taste signals here: ${lead}${tail}.`;
}
