/**
 * Match OpenStreetMap store elements to tracked brands.
 * Prefer brand:wikidata when the element carries it; otherwise match brand/name tags.
 */

export function normalizeWikidataQid(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^Q(\d+)$/i);
  if (match) return `Q${match[1]}`;
  return trimmed;
}

export type OsmBrandMatchSpec = {
  expectedQid?: string;
  names: string[];
};

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = raw.trim();
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function nameTagsMatchNeedles(
  tags: Record<string, string | undefined>,
  names: string[]
): boolean {
  const needles = uniqueNames(names).map((n) => n.toLowerCase());
  if (needles.length === 0) return false;

  const brandLower = tags.brand?.toLowerCase() ?? '';
  const nameLower = tags.name?.toLowerCase() ?? '';

  return needles.some((needle) => {
    if (!needle) return false;
    return (
      brandLower === needle ||
      nameLower === needle ||
      brandLower.includes(needle) ||
      needle.includes(brandLower) ||
      nameLower.includes(needle) ||
      needle.includes(nameLower)
    );
  });
}

export function osmTagsMatchBrand(
  tags: Record<string, string | undefined>,
  spec: OsmBrandMatchSpec
): boolean {
  const tagQid = tags['brand:wikidata'];
  if (tagQid) {
    if (!spec.expectedQid) return false;
    return normalizeWikidataQid(tagQid) === normalizeWikidataQid(spec.expectedQid);
  }
  return nameTagsMatchNeedles(tags, spec.names);
}

export type OverpassBrandHit = {
  name: string;
  brand?: string;
  brandWikidata?: string;
};

export type OverpassBrandSearch = {
  name: string;
  wikidata?: string;
  aliases?: string[];
};

export function overpassBrandMatchesSearch(
  hit: OverpassBrandHit,
  search: OverpassBrandSearch
): boolean {
  return osmTagsMatchBrand(
    {
      brand: hit.brand,
      name: hit.name,
      'brand:wikidata': hit.brandWikidata,
    },
    {
      expectedQid: search.wikidata,
      names: [search.name, ...(search.aliases ?? [])],
    }
  );
}
