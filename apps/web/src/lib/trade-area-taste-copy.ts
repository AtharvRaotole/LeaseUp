import type { TradeAreaTasteRow } from '@leaseup/contracts';

export function formatTradeAreaTasteRow(row: TradeAreaTasteRow): string {
  const affinityPct = (row.affinity * 100).toFixed(1);
  const rank = row.affinityRank.toFixed(3);
  return `${row.name} (affinity ${affinityPct}%, rank ${rank})`;
}
