import { describe, it, expect } from 'vitest';
import { resolveGeocodeFromCandidates } from '../lib/geocode-resolve';
import { GeocodeNotFoundError } from '../lib/errors';
import { errorHandler } from '../middleware/error-handler';

function mockContext() {
  return {
    req: { header: () => undefined },
    json: (body: unknown, status: number) => new Response(JSON.stringify(body), { status }),
    env: {},
  } as never;
}

describe('GeocodeNotFoundError', () => {
  it('resolveGeocodeFromCandidates throws when no candidates', () => {
    expect(() => resolveGeocodeFromCandidates('nowhere', [])).toThrow(GeocodeNotFoundError);
  });

  it('error handler returns 404 GEOCODE_NOT_FOUND', async () => {
    const res = await errorHandler(new GeocodeNotFoundError(), mockContext());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('GEOCODE_NOT_FOUND');
  });
});
