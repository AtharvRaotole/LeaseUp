import { describe, it, expect } from 'vitest';
import { normalizeHeatmapCells } from '../providers/qloo';
import { applyQlooHeatmapLocationParams } from '../providers/qloo-location';

describe('Qloo heatmap', () => {
  it('uses filter.location WKT for heatmap requests', () => {
    const url = new URL('https://example.com/v2/insights');
    applyQlooHeatmapLocationParams(url, {
      kind: 'point',
      latitude: 41.9088,
      longitude: -87.6776,
      radiusKm: 10,
    });
    expect(decodeURIComponent(url.toString())).toContain('filter.location=POINT(');
    expect(url.searchParams.get('filter.location.radius')).toBe('10000');
    expect(url.searchParams.has('signal.location')).toBe(false);
  });

  it('parses live cell shape with location.lat/lon and query.affinity', () => {
    const cells = normalizeHeatmapCells([
      {
        location: { latitude: 41.88263, longitude: -87.63245, geohash: 'dp3wmb' },
        query: { affinity: 1, affinity_rank: 0.997882, popularity: 1 },
      },
    ]);
    expect(cells).toEqual([
      {
        latitude: 41.88263,
        longitude: -87.63245,
        affinity_rank: 0.997882,
        affinity: 1,
        popularity: 1,
      },
    ]);
  });
});
