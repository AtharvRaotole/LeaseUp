import { describe, it, expect } from 'vitest';
import { applyQlooLocationParams, formatWktPoint } from '../providers/qloo-location';

describe('Qloo location params', () => {
  it('uses WKT POINT and radius meters', () => {
    const url = new URL('https://example.com/v2/insights');
    applyQlooLocationParams(url, {
      kind: 'point',
      latitude: 41.9088,
      longitude: -87.6776,
      radiusKm: 10,
    });

    expect(url.searchParams.get('signal.location')).toBe(
      formatWktPoint(-87.6776, 41.9088)
    );
    expect(url.searchParams.get('signal.location')).toContain('POINT(');
    expect(url.searchParams.get('signal.location.radius')).toBe('10000');
    expect(url.searchParams.has('signal.location.latitude')).toBe(false);
    expect(url.searchParams.has('signal.location.longitude')).toBe(false);
  });
});
