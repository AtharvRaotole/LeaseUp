type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  borough?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
};

/** Nominatim sometimes returns several house numbers separated by ; or , */
export function primaryHouseNumber(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const first = raw.split(/[;,]/)[0]?.trim();
  return first || undefined;
}

export function formatGeocodeCandidateLabel(
  displayName: string,
  address?: NominatimAddress
): string {
  if (!address) {
    return stripPoiLead(displayName);
  }

  const street = [primaryHouseNumber(address.house_number), address.road].filter(Boolean).join(' ').trim();
  const neighborhood =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district;
  const boroughOrCity =
    address.borough ||
    address.city ||
    address.town ||
    address.village ||
    address.county;

  const parts = [street, neighborhood, boroughOrCity].filter(
    (p): p is string => Boolean(p && p.trim())
  );

  if (parts.length > 0) return parts.join(', ');
  return stripPoiLead(displayName);
}

/** Drop leading POI / shop names Nominatim sometimes prepends to display_name. */
function stripPoiLead(displayName: string): string {
  const segments = displayName.split(',').map((s) => s.trim());
  if (segments.length <= 2) return displayName;
  const first = segments[0]!.toLowerCase();
  const looksLikeStreet =
    /\d/.test(first) ||
    /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|place|pl)\b/i.test(first);
  if (looksLikeStreet) return displayName;
  return segments.slice(1).join(', ');
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function dedupeGeocodeCandidatesWithinMeters<
  T extends { latitude: number; longitude: number },
>(candidates: T[], meters = 50): T[] {
  const kept: T[] = [];
  for (const c of candidates) {
    const near = kept.some(
      (k) => haversineMeters(k.latitude, k.longitude, c.latitude, c.longitude) < meters
    );
    if (!near) kept.push(c);
  }
  return kept;
}
