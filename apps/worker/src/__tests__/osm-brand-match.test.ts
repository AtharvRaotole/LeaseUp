import { describe, it, expect } from 'vitest';
import {
  REI_NAME_ONLY_TAGS,
  REI_QID,
  REI_SOHO_OSM_NODE,
  UNRELATED_REI_NAME_TAGS,
} from '@leaseup/fixtures/worker';
import {
  normalizeWikidataQid,
  osmTagsMatchBrand,
  overpassBrandMatchesSearch,
} from '../lib/osm-brand-match';

describe('osm-brand-match', () => {
  const reiSpec = { expectedQid: REI_QID, names: ['REI', 'REI Co-op'] };

  it('matches REI SoHo by brand:wikidata even when the name is REI Co-op', () => {
    expect(osmTagsMatchBrand(REI_SOHO_OSM_NODE.tags, reiSpec)).toBe(true);
  });

  it('does not match a same-name store when brand:wikidata disagrees (before: name-only false positive)', () => {
    expect(osmTagsMatchBrand(UNRELATED_REI_NAME_TAGS.tags, reiSpec)).toBe(false);
  });

  it('falls back to brand/name tags when brand:wikidata is absent', () => {
    expect(osmTagsMatchBrand(REI_NAME_ONLY_TAGS.tags, reiSpec)).toBe(true);
  });

  it('normalizes lowercase q ids', () => {
    expect(normalizeWikidataQid('q3414933')).toBe('Q3414933');
  });

  it('overpassBrandMatchesSearch prefers wikidata on the hit', () => {
    const conflict = overpassBrandMatchesSearch(
      { name: 'REI', brand: 'REI', brandWikidata: 'Q9999999' },
      { name: 'REI', wikidata: REI_QID }
    );
    expect(conflict).toBe(false);

    const soho = overpassBrandMatchesSearch(
      {
        name: 'REI Co-op',
        brand: 'REI',
        brandWikidata: REI_QID,
      },
      { name: 'REI', wikidata: REI_QID }
    );
    expect(soho).toBe(true);
  });
});
