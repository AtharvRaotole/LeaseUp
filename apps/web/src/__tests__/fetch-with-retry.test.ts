import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithOneRetry, isNetworkFetchError, isRetryableHttpStatus } from '../lib/fetch-with-retry';

describe('fetch-with-retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries once on 503', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const onAutoRetry = vi.fn();
    const promise = fetchWithOneRetry('/api/test', undefined, { onAutoRetry });
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onAutoRetry).toHaveBeenCalledTimes(1);
  });

  it('retries once on network TypeError', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchWithOneRetry('/api/test');
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifies retryable statuses and network errors', () => {
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isNetworkFetchError(new TypeError('x'))).toBe(true);
    expect(isNetworkFetchError(new Error('Failed to fetch'))).toBe(true);
  });
});
