import { describe, it, expect } from 'vitest';
import {
  coTenancyLineFromPicked,
  pairingCandidates,
  parseCoAffinityFromInsights,
  pickPairingsForReport,
  type IncumbentAffinity,
} from '../lib/co-tenancy-pairing';

const PITCH = 'PPPP0000-0000-0000-0000-000000000000';
const IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(
  (c) => `${c.repeat(4)}1111-1111-1111-1111-111111111111`
);

function shares(values: number[]): IncumbentAffinity[] {
  return values.map((affinity, i) => ({ entityId: IDS[i] ?? `x${i}`, affinity }));
}

describe('parseCoAffinityFromInsights', () => {
  const raw = {
    results: {
      entities: [
        {
          entity_id: PITCH,
          name: 'Pitch',
          query: {
            affinity: 0.93,
            explainability: {
              'signal.interests.entities': [
                { entity_id: IDS[0], score: 0.4 },
                { entity_id: IDS[1], score: 0.35 },
                { entity_id: 'NOT-REQUESTED', score: 0.25 },
              ],
            },
          },
        },
      ],
    },
  };

  it('reads per-incumbent explainability shares from the pitched brand row', () => {
    const rows = parseCoAffinityFromInsights(raw, [IDS[0]!, IDS[1]!], PITCH);
    expect(rows.map((r) => [r.entityId, r.affinity])).toEqual([
      [IDS[0], 0.4],
      [IDS[1], 0.35],
    ]);
  });

  it('ignores responses without the pitched brand row', () => {
    expect(parseCoAffinityFromInsights(raw, [IDS[0]!], 'OTHER')).toEqual([]);
    expect(parseCoAffinityFromInsights({ results: { entities: [] } }, [IDS[0]!], PITCH)).toEqual(
      []
    );
  });
});

describe('pairingCandidates', () => {
  it('omits pairings when shares are close to uniform', () => {
    const flat = shares([0.13, 0.126, 0.125, 0.124, 0.124, 0.124, 0.124, 0.123]);
    expect(pairingCandidates(flat)).toEqual([]);
  });

  it('keeps incumbents that clearly beat the uniform share, strongest first', () => {
    const rows = shares([0.16, 0.11, 0.15, 0.115, 0.115, 0.115, 0.115, 0.12]);
    expect(pairingCandidates(rows).map((r) => r.entityId)).toEqual([IDS[0], IDS[2]]);
  });

  it('omits an incumbent that every pitched brand rates this high', () => {
    const rows = shares([0.16, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]);
    const peers = [rows, rows, rows];
    expect(pairingCandidates(rows, peers)).toEqual([]);
  });

  it('omits when too few incumbents carry a share', () => {
    expect(pairingCandidates(shares([0.7, 0.2, 0.1]))).toEqual([]);
  });
});

describe('pickPairingsForReport', () => {
  const base = [0.12, 0.125, 0.125, 0.125, 0.125, 0.125, 0.13, 0.125];
  const strongAt = (i: number, v: number) => shares(base.map((b, j) => (j === i ? v : b)));

  it('drops an incumbent that would pair with more than one brand, for all of them', () => {
    const lists = [strongAt(0, 0.17), strongAt(0, 0.165), shares(base), shares(base), shares(base)];
    const picked = pickPairingsForReport(lists);
    expect(picked.every((rows) => rows.length === 0)).toBe(true);
  });

  it('keeps an incumbent that stands out for exactly one brand', () => {
    const lists = [strongAt(0, 0.17), strongAt(2, 0.17), shares(base), shares(base), shares(base)];
    const picked = pickPairingsForReport(lists);
    expect(picked[0]?.map((r) => r.entityId)).toEqual([IDS[0]]);
    expect(picked[1]?.map((r) => r.entityId)).toEqual([IDS[2]]);
    expect(picked.slice(2).every((rows) => rows.length === 0)).toBe(true);
  });

  it('drops only the shared incumbent and keeps a brand\'s distinct one', () => {
    const both = shares(base.map((b, j) => (j === 0 ? 0.17 : j === 3 ? 0.165 : b)));
    const lists = [both, strongAt(0, 0.17), shares(base), shares(base), shares(base)];
    const picked = pickPairingsForReport(lists);
    expect(picked[0]?.map((r) => r.entityId)).toEqual([IDS[3]]);
    expect(picked[1]).toEqual([]);
  });

  it('a brand left with nothing gets no line', () => {
    const lists = [strongAt(0, 0.17), strongAt(0, 0.165), shares(base), shares(base), shares(base)];
    const picked = pickPairingsForReport(lists);
    expect(coTenancyLineFromPicked(picked[0] ?? [], [])).toBeUndefined();
  });
});

describe('coTenancyLineFromPicked', () => {
  it('uses OSM names when available', () => {
    const rows = shares([0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    const line = coTenancyLineFromPicked(pairingCandidates(rows).slice(0, 2), [
      { entityId: IDS[0]!, name: 'OSM Name', distanceKm: 0.5 },
    ]);
    expect(line).toBe('Pairs well with OSM Name nearby');
  });

  it('formats two names and returns undefined for none', () => {
    const rows = shares([0.2, 0.18, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    expect(coTenancyLineFromPicked(pairingCandidates(rows).slice(0, 2), [])).toMatch(
      /^Pairs well with \S+ and \S+ nearby$/
    );
    expect(coTenancyLineFromPicked([], [])).toBeUndefined();
  });
});
