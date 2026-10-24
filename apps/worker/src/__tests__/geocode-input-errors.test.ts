import { describe, it, expect } from 'vitest';
import { GeocodeService } from '../services/geocode';
import { GeocodeInputError } from '../lib/errors';
import { errorHandler } from '../middleware/error-handler';

const cache = {
  get: async () => null,
  putJsonIfChanged: async () => undefined,
} as never;

function mockContext() {
  return {
    req: { header: () => undefined },
    json: (body: unknown, status: number) => new Response(JSON.stringify(body), { status }),
    env: {},
  } as never;
}

describe('GeocodeService address guards', () => {
  const service = new GeocodeService(cache, 'LeaseUp/test', 'live');

  it('preview throws GeocodeInputError for PO box', async () => {
    await expect(service.preview('P.O. Box 12, Denver, CO 80202')).rejects.toBeInstanceOf(
      GeocodeInputError
    );
  });

  it('error handler maps GeocodeInputError to 400', async () => {
    const err = new GeocodeInputError('GEOCODE_NON_US', 'US only');
    const res = await errorHandler(err, mockContext());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('GEOCODE_NON_US');
  });
});
