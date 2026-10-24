/** User-facing nearest-store lines. Never use ATP or OSM acronyms. */

export function nearestStoreDistanceUnconfirmedLine(brandDisplayName: string): string {
  return `Nearest ${brandDisplayName} distance is unconfirmed: All The Places and OpenStreetMap store data disagree.`;
}

export function nearestChainStoreDistanceUnconfirmedLine(): string {
  return 'Nearest chain store distance is unconfirmed: All The Places and OpenStreetMap store data disagree.';
}
