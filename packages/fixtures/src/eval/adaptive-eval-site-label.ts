import type { AdaptiveEvalAddressRow } from './results-adaptive-types.js';

const PURELY_NUMERIC_LABEL = /^\d+$/;

/** Street line and city from a recorded US-style address string (no invented parts). */
export function streetAddressPlusCity(recordedAddress: string): string | undefined {
  const trimmed = recordedAddress.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const street = parts[0];
  if (!street) return undefined;
  const city = parts.length >= 2 ? parts[1] : undefined;
  if (!city) return street;
  return `${street}, ${city}`;
}

function titleCaseWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Fallback when address is missing: city/state from recorded eval id (e.g. athens_ga). */
export function placeFromEvalId(evalId: string): string | undefined {
  const trimmed = evalId.trim();
  const match = trimmed.match(/^(.+)_([a-z]{2})$/i);
  const placePart = match?.[1];
  const statePart = match?.[2];
  if (!placePart || !statePart) return undefined;
  const place = titleCaseWords(placePart.replace(/_/g, ' '));
  const state = statePart.toUpperCase();
  return `${place}, ${state}`;
}

/** Broker-facing site label for the 40-address adaptive eval table. */
export function adaptiveEvalSiteDisplayLabel(row: AdaptiveEvalAddressRow): string {
  const fromAddress = streetAddressPlusCity(row.address);
  if (fromAddress) return fromAddress;

  const label = row.label?.trim() ?? '';
  if (label && !PURELY_NUMERIC_LABEL.test(label)) return label;

  const fromId = placeFromEvalId(row.eval_id ?? row.id ?? '');
  if (fromId) return fromId;

  return label || row.eval_id || row.id || 'Site';
}

export function isPurelyNumericSiteLabel(label: string): boolean {
  return PURELY_NUMERIC_LABEL.test(label.trim());
}
