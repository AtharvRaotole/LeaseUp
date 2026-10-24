/** Plain broker copy for store-absence checks (why card, summaries). No ATP/OSM jargon. */

export function brokerNoStoreWithinRadiusDualSource(
  radiusKm: number,
  storeDataDateLabel: string
): string {
  return `No store within ${radiusKm} km (checked ${storeDataDateLabel}).`;
}

export function brokerNoStoreWithinRadiusSingleSource(
  radiusKm: number,
  storeDataDateLabel: string
): string {
  return `No store within ${radiusKm} km in our store data as of ${storeDataDateLabel}.`;
}

export function brokerNoStoreWithinRadiusDualSourceShort(radiusKm: number): string {
  return `No store within ${radiusKm} km (checked in our store data).`;
}

export function brokerNoStoreWithinRadiusSingleSourceShort(radiusKm: number): string {
  return `No store within ${radiusKm} km in our store data.`;
}
