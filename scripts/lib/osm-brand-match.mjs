/** Keep in sync with apps/worker/src/lib/osm-brand-match.ts (snapshot build). */

export function normalizeWikidataQid(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^Q(\d+)$/i);
  if (match) return `Q${match[1]}`;
  return trimmed;
}

function uniqueNames(names) {
  const seen = new Set();
  const out = [];
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

function nameTagsMatchNeedles(tags, names) {
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

export function osmTagsMatchBrand(tags, spec) {
  const tagQid = tags['brand:wikidata'];
  if (tagQid) {
    if (!spec.expectedQid) return false;
    return normalizeWikidataQid(tagQid) === normalizeWikidataQid(spec.expectedQid);
  }
  return nameTagsMatchNeedles(tags, spec.names);
}
