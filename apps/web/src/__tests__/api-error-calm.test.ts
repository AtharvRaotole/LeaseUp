import { describe, it, expect } from 'vitest';
import { humanizeApiError, apiErrorFromUnknown } from '../lib/api-error';
import { SERVER_BUSY_MESSAGE } from '../lib/calm-error-copy';

describe('api-error calm copy', () => {
  it('maps 503 and worker 1102 to server busy', () => {
    expect(humanizeApiError(503, { code: 'SERVER_BUSY' }).message).toBe(SERVER_BUSY_MESSAGE);
    expect(humanizeApiError(502, { code: '1102' }).code).toBe('SERVER_BUSY');
    expect(humanizeApiError(500, { error: 'Error 1102' }).code).toBe('SERVER_BUSY');
  });

  it('never surfaces raw fetch errors to brokers', () => {
    const info = apiErrorFromUnknown(new TypeError('Failed to fetch'));
    expect(info.message).toBe(SERVER_BUSY_MESSAGE);
    expect(info.code).toBe('NETWORK_ERROR');
  });

  it('maps GEOCODE_NOT_FOUND to storefront guidance', () => {
    const info = humanizeApiError(404, {
      code: 'GEOCODE_NOT_FOUND',
      error: 'We could not find that street address.',
    });
    expect(info.code).toBe('GEOCODE_NOT_FOUND');
    expect(info.message).toContain('street address');
  });

  it('maps QLOO_UNAVAILABLE to calm taste copy', () => {
    const info = humanizeApiError(503, {
      code: 'QLOO_UNAVAILABLE',
      error: 'Taste data is slow right now. Try again in a moment.',
    });
    expect(info.message).toContain('Taste data is slow');
    expect(info.code).toBe('QLOO_UNAVAILABLE');
  });

  it('maps typed-address guard codes', () => {
    const po = humanizeApiError(400, {
      code: 'GEOCODE_PO_BOX',
      error: 'We need a street address for a retail storefront.',
    });
    expect(po.code).toBe('GEOCODE_PO_BOX');
    const timeout = humanizeApiError(503, {
      code: 'GEOCODE_TIMEOUT',
      error: 'Address lookup timed out.',
    });
    expect(timeout.code).toBe('GEOCODE_TIMEOUT');
  });
});
