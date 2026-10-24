export type NominatimAddress = {
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

export function isPoiClass(className?: string): boolean {
  const cls = className?.toLowerCase();
  return cls === 'shop' || cls === 'amenity' || cls === 'tourism';
}

export function hasStreetAddress(address?: NominatimAddress): boolean {
  const house = primaryHouseNumber(address?.house_number);
  const road = address?.road?.trim();
  return Boolean(house && road);
}

/** True when the hit should be dropped as a POI without a usable street address. */
export function isPoiOnlyResult(result: {
  class?: string;
  type?: string;
  address?: NominatimAddress;
}): boolean {
  if (isPoiClass(result.class)) {
    return !hasStreetAddress(result.address);
  }
  const cls = result.class?.toLowerCase();
  const typ = result.type?.toLowerCase();
  if (typ === 'house' || typ === 'building' || typ === 'address' || typ === 'residential') {
    return false;
  }
  if (cls === 'building' || cls === 'place') return false;
  if (cls === 'poi') return !hasStreetAddress(result.address);
  return false;
}

/** Address-only label for amenity/shop/tourism nodes (never the POI name). */
export function formatPoiAddressLabel(address: NominatimAddress): string {
  const street = [primaryHouseNumber(address.house_number), address.road].filter(Boolean).join(' ').trim();
  const neighborhood =
    address.neighbourhood || address.suburb || address.quarter || address.city_district;
  const city = address.city || address.town || address.village;
  const state = address.state;
  return [street, neighborhood, city, state].filter((p): p is string => Boolean(p && p.trim())).join(', ');
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

  const fromDisplay = streetLineFromDisplayName(displayName);
  if (fromDisplay) return fromDisplay;
  return stripPoiLead(displayName);
}

/** House number + road from Nominatim display_name when addressdetails are incomplete. */
export function streetLineFromDisplayName(displayName: string): string | undefined {
  const afterPoi = stripPoiLead(displayName);
  const segments = afterPoi.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length >= 2 && /^\d+[A-Za-z]?(-\d+)?$/.test(segments[0]!)) {
    return `${segments[0]} ${segments[1]}`.replace(/\s+/g, ' ').trim();
  }
  const first = segments[0];
  if (
    first &&
    /\d/.test(first) &&
    /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|place|pl)\b/i.test(first)
  ) {
    return first;
  }
  return undefined;
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
