/** User-facing nearest-store lines. Never use ATP or OSM acronyms. */

export function nearestStoreDistanceUnconfirmedLine(brandDisplayName: string): string {
  return `Nearest ${brandDisplayName} distance is unconfirmed. Store listings disagree beyond what we can verify at this pin.`;
}

export function nearestChainStoreDistanceUnconfirmedLine(): string {
  return 'Nearest chain store distance is unconfirmed. Store listings disagree beyond what we can verify at this pin.';
}
