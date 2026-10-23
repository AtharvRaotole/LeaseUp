/**
 * Build a batched Overpass QL query for specific prospect brands only.
 */

export interface OverpassSearchBrand {
  entityId: string;
  name: string;
  wikidata?: string;
  /** Extra OSM brand/name tags to match (aliases). */
  aliases?: string[];
}

const OVERPASS_TIMEOUT_SEC = 8;

/** Escape literal for use inside Overpass regex (case-sensitive). */
export function escapeOverpassRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function collectBrandSearchTerms(brand: OverpassSearchBrand): {
  names: string[];
  wikidata: string[];
} {
  const names = uniqueNonEmpty([brand.name, ...(brand.aliases ?? [])]);
  const wikidata = uniqueNonEmpty(
    brand.wikidata ? [brand.wikidata.replace(/^q/i, 'Q')] : []
  );
  return { names, wikidata };
}

export function buildProspectOverpassQuery(
  lat: number,
  lng: number,
  radiusKm: number,
  brands: OverpassSearchBrand[]
): string {
  if (brands.length === 0) {
    return `[out:json][timeout:${OVERPASS_TIMEOUT_SEC}];node(around:1,${lat},${lng});out center tags;`;
  }

  const radiusMeters = Math.round(radiusKm * 1000);
  const nameParts: string[] = [];
  const wikidataParts: string[] = [];

  for (const brand of brands) {
    const { names, wikidata } = collectBrandSearchTerms(brand);
    for (const n of names) {
      nameParts.push(escapeOverpassRegex(n));
    }
    for (const q of wikidata) {
      wikidataParts.push(escapeOverpassRegex(q));
    }
  }

  const nameRegex = nameParts.length ? `^(${nameParts.join('|')})$` : null;
  const wikidataRegex = wikidataParts.length ? `^(${wikidataParts.join('|')})$` : null;

  const clauses: string[] = [];

  if (nameRegex) {
    clauses.push(`node["brand"~"${nameRegex}",i](around:${radiusMeters},${lat},${lng});`);
    clauses.push(`way["brand"~"${nameRegex}",i](around:${radiusMeters},${lat},${lng});`);
    clauses.push(
      `node["name"~"${nameRegex}",i](around:${radiusMeters},${lat},${lng})["shop"];`
    );
    clauses.push(`way["name"~"${nameRegex}",i](around:${radiusMeters},${lat},${lng})["shop"];`);
  }

  if (wikidataRegex) {
    clauses.push(
      `node["brand:wikidata"~"${wikidataRegex}"](around:${radiusMeters},${lat},${lng});`
    );
    clauses.push(
      `way["brand:wikidata"~"${wikidataRegex}"](around:${radiusMeters},${lat},${lng});`
    );
  }

  return `
[out:json][timeout:${OVERPASS_TIMEOUT_SEC}];
(
  ${clauses.join('\n  ')}
);
out center tags;
`.trim();
}
