import { describe, it, expect } from 'vitest';
import { humanizeApiError } from '../lib/api-error';

describe('analyze stream error events', () => {
  it('humanizes Qloo timeout payload like SSE error events', () => {
    const payload = {
      message: 'Taste data is slow right now. Try again in a moment.',
      code: 'QLOO_UNAVAILABLE',
      retryAfterSec: 30,
    };
    const info = humanizeApiError(502, {
      error: payload.message,
      code: payload.code,
      retryAfter: payload.retryAfterSec,
    });
    expect(info.code).toBe('QLOO_UNAVAILABLE');
    expect(info.message).toMatch(/Taste data is slow/);
    expect(info.retryAfterSec).toBe(30);
  });

  it('does not map Qloo errors to generic server busy', () => {
    const info = humanizeApiError(502, {
      error: 'Taste data is slow right now. Try again in a moment.',
      code: 'QLOO_UNAVAILABLE',
    });
    expect(info.code).not.toBe('SERVER_BUSY');
    expect(info.message).not.toMatch(/servers are busy/i);
  });
});
