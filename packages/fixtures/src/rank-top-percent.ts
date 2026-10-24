/**
 * Broker-facing "top X%" from list order: rank 1 is best among `totalScored` brands.
 */
export function rankTopPercentFromOrder(rank: number, totalScored: number): number {
  if (totalScored <= 0 || rank <= 0) return 1;
  return Math.max(1, Math.min(100, Math.ceil((rank / totalScored) * 100)));
}
