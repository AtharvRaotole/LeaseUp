import type { GeocodeCandidate } from '@leaseup/contracts';
import { haversineMeters } from './geocode-label';
import { parseUsAddress } from './parse-us-address';

const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;

const STATE_ALIASES: Record<string, string> = {
  alabama: 'alabama',
  al: 'alabama',
  alaska: 'alaska',
  ak: 'alaska',
  arizona: 'arizona',
  az: 'arizona',
  arkansas: 'arkansas',
  ar: 'arkansas',
  california: 'california',
  ca: 'california',
  colorado: 'colorado',
  co: 'colorado',
  connecticut: 'connecticut',
  ct: 'connecticut',
  delaware: 'delaware',
  de: 'delaware',
  florida: 'florida',
  fl: 'florida',
  georgia: 'georgia',
  ga: 'georgia',
  hawaii: 'hawaii',
  hi: 'hawaii',
  idaho: 'idaho',
  id: 'idaho',
  illinois: 'illinois',
  il: 'illinois',
  indiana: 'indiana',
  in: 'indiana',
  iowa: 'iowa',
  ia: 'iowa',
  kansas: 'kansas',
  ks: 'kansas',
  kentucky: 'kentucky',
  ky: 'kentucky',
  louisiana: 'louisiana',
  la: 'louisiana',
  maine: 'maine',
  me: 'maine',
  maryland: 'maryland',
  md: 'maryland',
  massachusetts: 'massachusetts',
  ma: 'massachusetts',
  michigan: 'michigan',
  mi: 'michigan',
  minnesota: 'minnesota',
  mn: 'minnesota',
  mississippi: 'mississippi',
  ms: 'mississippi',
  missouri: 'missouri',
  mo: 'missouri',
  montana: 'montana',
  mt: 'montana',
  nebraska: 'nebraska',
  ne: 'nebraska',
  nevada: 'nevada',
  nv: 'nevada',
  'new hampshire': 'new hampshire',
  nh: 'new hampshire',
  'new jersey': 'new jersey',
  nj: 'new jersey',
  'new mexico': 'new mexico',
  nm: 'new mexico',
  'new york': 'new york',
  ny: 'new york',
  'north carolina': 'north carolina',
  nc: 'north carolina',
  'north dakota': 'north dakota',
  nd: 'north dakota',
  ohio: 'ohio',
  oh: 'ohio',
  oklahoma: 'oklahoma',
  ok: 'oklahoma',
  oregon: 'oregon',
  or: 'oregon',
  pennsylvania: 'pennsylvania',
  pa: 'pennsylvania',
  'rhode island': 'rhode island',
  ri: 'rhode island',
  'south carolina': 'south carolina',
  sc: 'south carolina',
  'south dakota': 'south dakota',
  sd: 'south dakota',
  tennessee: 'tennessee',
  tn: 'tennessee',
  texas: 'texas',
  tx: 'texas',
  utah: 'utah',
  ut: 'utah',
  vermont: 'vermont',
  vt: 'vermont',
  virginia: 'virginia',
  va: 'virginia',
  washington: 'washington',
  wa: 'washington',
  'west virginia': 'west virginia',
  wv: 'west virginia',
  wisconsin: 'wisconsin',
  wi: 'wisconsin',
  wyoming: 'wyoming',
  wy: 'wyoming',
  'district of columbia': 'district of columbia',
  dc: 'district of columbia',
};

export function postalCodeFromResolved(resolvedAddress: string): string | null {
  const match = resolvedAddress.match(ZIP_RE);
  return match?.[1] ?? null;
}

function normalizeStateToken(raw: string): string {
  const key = raw.trim().toLowerCase();
  return STATE_ALIASES[key] ?? key;
}

export function stateFromResolved(resolvedAddress: string): string | null {
  const parsed = parseUsAddress(resolvedAddress);
  if (parsed.state) return normalizeStateToken(parsed.state);

  const zipMatch = resolvedAddress.match(ZIP_RE);
  if (!zipMatch || zipMatch.index === undefined) return null;
  const beforeZip = resolvedAddress.slice(0, zipMatch.index);
  const parts = beforeZip.split(',').map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;
  if (/^[A-Za-z]{2}$/.test(last)) return normalizeStateToken(last);
  return normalizeStateToken(last);
}

function normalizeCityToken(city: string): string {
  return city.trim().toLowerCase().replace(/\s+county$/i, '');
}

export function normalizedCityStateKey(c: GeocodeCandidate): string {
  const city = normalizeCityToken(c.city ?? '');
  const state = stateFromResolved(c.resolvedAddress) ?? '';
  return `${city}|${state}`;
}

/** When the broker typed a ZIP, drop candidates whose ZIP does not match. */
export function filterCandidatesByInputPostalCode(
  inputAddress: string,
  candidates: GeocodeCandidate[]
): GeocodeCandidate[] {
  const { postalCode } = parseUsAddress(inputAddress);
  if (!postalCode) return candidates;
  return candidates.filter((c) => postalCodeFromResolved(c.resolvedAddress) === postalCode);
}

/** Merge Nominatim duplicates within a short radius when city and state normalize the same. */
export function dedupeGeocodeCandidatesByPlaceAndDistance<T extends GeocodeCandidate>(
  candidates: T[],
  meters = 50
): T[] {
  const kept: T[] = [];
  for (const c of candidates) {
    const key = normalizedCityStateKey(c);
    const nearDuplicate = kept.some((k) => {
      if (normalizedCityStateKey(k) !== key) return false;
      return haversineMeters(k.latitude, k.longitude, c.latitude, c.longitude) < meters;
    });
    if (!nearDuplicate) kept.push(c);
  }
  return kept;
}
