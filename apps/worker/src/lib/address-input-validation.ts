export type AddressInputRejection = {
  code: 'GEOCODE_PO_BOX' | 'GEOCODE_NON_US' | 'GEOCODE_UNRECOGNIZED';
  message: string;
};

const PO_BOX_RE = /\bP\.?\s*O\.?\s*Box\b/i;
const POB_RE = /\bPOB\s*#?\s*\d+/i;

const NON_US_HINTS: RegExp[] = [
  /\b(united kingdom|england|scotland|wales|northern ireland)\b/i,
  /\b(canada|ontario|quebec|british columbia|alberta|manitoba)\b/i,
  /\b(mexico|australia|germany|france|spain|italy|india|japan)\b/i,
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i, // UK postcode (rough)
  /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/i, // Canadian postal
];

const US_STATE_RE =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

const STREET_SUFFIX_RE =
  /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|highway|hwy|parkway|pkwy|circle|cir|trail|trl)\b/i;

const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/;

export const GEOCODE_PO_BOX_MESSAGE =
  'We need a street address for a retail storefront. PO boxes cannot be mapped to a pin.';
export const GEOCODE_NON_US_MESSAGE =
  'LeaseUp supports US storefront addresses only. Enter street, city, and state (or ZIP) in the United States.';
export const GEOCODE_UNRECOGNIZED_MESSAGE =
  'That does not look like a US storefront address. Type street, city, and state, or add a ZIP code.';

/** Fast client-side guard before Nominatim or Qloo. */
export function rejectAddressInput(address: string): AddressInputRejection | null {
  const trimmed = address.trim();
  if (!trimmed) {
    return { code: 'GEOCODE_UNRECOGNIZED', message: GEOCODE_UNRECOGNIZED_MESSAGE };
  }

  if (PO_BOX_RE.test(trimmed) || POB_RE.test(trimmed)) {
    return { code: 'GEOCODE_PO_BOX', message: GEOCODE_PO_BOX_MESSAGE };
  }

  for (const re of NON_US_HINTS) {
    if (re.test(trimmed)) {
      return { code: 'GEOCODE_NON_US', message: GEOCODE_NON_US_MESSAGE };
    }
  }

  const hasZip = ZIP_RE.test(trimmed);
  const hasUsState = US_STATE_RE.test(trimmed);
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const streetPart = parts[0] ?? trimmed;
  const hasStreetNumber = /\d/.test(streetPart);
  const hasStreetSuffix = STREET_SUFFIX_RE.test(streetPart);
  const looksLikeStreetLine =
    hasStreetNumber || (hasStreetSuffix && streetPart.length >= 4);

  if (!looksLikeStreetLine) {
    const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
    const vowels = lettersOnly.replace(/[^aeiouAEIOU]/g, '').length;
    const gibberish =
      trimmed.length < 8 ||
      (lettersOnly.length >= 6 && vowels / Math.max(lettersOnly.length, 1) < 0.15);
    if (gibberish) {
      return { code: 'GEOCODE_UNRECOGNIZED', message: GEOCODE_UNRECOGNIZED_MESSAGE };
    }
  }

  const wellFormedUs = parts.length >= 2 && (hasZip || hasUsState) && looksLikeStreetLine;
  if (wellFormedUs) return null;

  // Partial US typing (Main St, 1574 N Milwaukee, Chicago) goes to Nominatim for confirm or not-found.
  if (looksLikeStreetLine) return null;

  return { code: 'GEOCODE_UNRECOGNIZED', message: GEOCODE_UNRECOGNIZED_MESSAGE };
}
