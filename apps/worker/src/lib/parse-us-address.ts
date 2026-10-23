export type ParsedUsAddress = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;

/** Best-effort US address split for Nominatim structured search. */
export function parseUsAddress(input: string): ParsedUsAddress {
  let working = input.trim();
  if (!working) return {};

  const zipMatch = working.match(ZIP_RE);
  const postalCode = zipMatch?.[1];
  if (zipMatch) {
    working = working.replace(zipMatch[0], '').replace(/,\s*$/, '').trim();
  }

  const parts = working
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return { postalCode };

  let state: string | undefined;
  const last = parts[parts.length - 1]!;
  const stateOnly = last.match(/^([A-Za-z]{2})$/);
  if (stateOnly) {
    state = stateOnly[1]!.toUpperCase();
    parts.pop();
  } else {
    const cityState = last.match(/^(.+?)\s+([A-Za-z]{2})$/);
    if (cityState && cityState[2]!.length === 2) {
      parts.pop();
      parts.push(cityState[1]!.trim());
      state = cityState[2]!.toUpperCase();
    }
  }

  if (parts.length === 1) {
    return { street: parts[0], state, postalCode };
  }

  const street = parts[0];
  const city = parts.slice(1).join(', ');
  return { street, city, state, postalCode };
}
