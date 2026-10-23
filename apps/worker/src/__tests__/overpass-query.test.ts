import { describe, it, expect } from 'vitest';
import { buildProspectOverpassQuery, escapeOverpassRegex } from '../lib/overpass-query';

describe('buildProspectOverpassQuery', () => {
  it('scopes to prospect brands with filter.location-style around and no output limit', () => {
    const q = buildProspectOverpassQuery(41.91, -87.68, 10, [
      { entityId: 'a', name: 'REI', wikidata: 'Q3414933' },
      { entityId: 'b', name: "Lululemon" },
    ]);
    expect(q).toContain('[timeout:8]');
    expect(q).toContain('around:10000,41.91,-87.68');
    expect(q).toContain('["brand:wikidata"~"^(Q3414933)$"]');
    expect(q).toContain('["brand"~"^(REI|Lululemon)$",i]');
    expect(q).toContain('out center tags;');
    expect(q).not.toContain('out center tags 200');
  });

  it('escapes regex metacharacters in brand names', () => {
    expect(escapeOverpassRegex('AT&T')).toBe('AT&T');
    expect(escapeOverpassRegex('C++')).toContain('\\+');
  });
});
