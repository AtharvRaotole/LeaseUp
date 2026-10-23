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

  it('maps QLOO_UNAVAILABLE to calm taste copy', () => {
    const info = humanizeApiError(503, {
      code: 'QLOO_UNAVAILABLE',
      error: 'Taste data is slow right now. Try again in a moment.',
    });
    expect(info.message).toContain('Taste data is slow');
    expect(info.code).toBe('QLOO_UNAVAILABLE');
  });
});
