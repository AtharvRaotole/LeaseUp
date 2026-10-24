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
  it('caps how many brands one incumbent is named for', () => {
    const base = [0.12, 0.125, 0.125, 0.125, 0.125, 0.125, 0.13, 0.125];
    const strong = (v: number) => shares([v, ...base.slice(1)]);
    const lists = [strong(0.17), strong(0.165), strong(0.16), shares(base), shares(base), shares(base)];
    const picked = pickPairingsForReport(lists);
    const named = picked.filter((rows) => rows.some((r) => r.entityId === IDS[0])).length;
    expect(named).toBe(2);
    expect(picked[0]?.[0]?.entityId).toBe(IDS[0]);
    expect(picked[2]).toEqual([]);
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
