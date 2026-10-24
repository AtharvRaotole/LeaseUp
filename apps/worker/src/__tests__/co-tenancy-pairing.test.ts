import { describe, it, expect } from 'vitest';
import {
  buildCoTenancyLineFromAffinities,
  formatCoTenancyPairingLine,
  parseCoAffinityFromInsights,
  pickPairingIncumbents,
  CO_TENANCY_PAIR_AFFINITY_MIN,
} from '../lib/co-tenancy-pairing';

describe('formatCoTenancyPairingLine', () => {
  it('formats one, two, and many incumbent names', () => {
    expect(formatCoTenancyPairingLine(['Lululemon'])).toBe('Pairs well with Lululemon nearby');
    expect(formatCoTenancyPairingLine(['Lululemon', 'Sweetgreen'])).toBe(
      'Pairs well with Lululemon and Sweetgreen nearby'
    );
    expect(formatCoTenancyPairingLine(['A', 'B', 'C'])).toBe(
      'Pairs well with A, B, and C nearby'
    );
  });

  it('returns undefined when no names', () => {
    expect(formatCoTenancyPairingLine([])).toBeUndefined();
  });
});

describe('parseCoAffinityFromInsights', () => {
  const incumbent = 'AAAA1111-1111-1111-1111-111111111111';
  const other = 'BBBB2222-2222-2222-2222-222222222222';

  it('reads affinity from explainability rows for requested incumbents', () => {
    const raw = {
      results: {
        entities: [
          {
            entity_id: incumbent,
            name: 'Sweetgreen',
            query: { affinity: 0.61 },
          },
          {
            entity_id: other,
            name: 'Other',
            query: { affinity: 0.9 },
          },
        ],
      },
    };
    const rows = parseCoAffinityFromInsights(raw, [incumbent]);
    expect(rows).toHaveLength(1);
    const first = rows[0];
    expect(first?.affinity).toBe(0.61);
    expect(first?.name).toBe('Sweetgreen');
  });
});

describe('buildCoTenancyLineFromAffinities', () => {
  it('omits line when affinity below threshold', () => {
    const id = 'CCCC3333-3333-3333-3333-333333333333';
    const line = buildCoTenancyLineFromAffinities(
      [{ entityId: id, name: 'Low', affinity: CO_TENANCY_PAIR_AFFINITY_MIN - 0.01 }],
      [{ entityId: id, name: 'Low', distanceKm: 1 }]
    );
    expect(line).toBeUndefined();
  });

  it('uses OSM names when available', () => {
    const id = 'DDDD4444-4444-4444-4444-444444444444';
    const line = buildCoTenancyLineFromAffinities(
      [{ entityId: id, name: 'API Name', affinity: 0.8 }],
      [{ entityId: id, name: 'OSM Name', distanceKm: 0.5 }]
    );
    expect(line).toContain('OSM Name');
  });
});

describe('pickPairingIncumbents', () => {
  it('keeps top two by affinity above min', () => {
    const rows = pickPairingIncumbents(
      [
        { entityId: 'a', name: 'A', affinity: 0.55 },
        { entityId: 'b', name: 'B', affinity: 0.7 },
        { entityId: 'c', name: 'C', affinity: 0.6 },
      ],
      0.52,
      2
    );
    expect(rows.map((r) => r.entityId)).toEqual(['b', 'c']);
  });
});
