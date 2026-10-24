import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchQlooWithRetry,
  isRetryableQlooStatus,
  jitteredBackoffMs,
  QLOO_UNAVAILABLE_USER_MESSAGE,
} from '../providers/qloo-fetch';
import { UpstreamError } from '../lib/errors';

describe('fetchQlooWithRetry', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries 5xx then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

    const sleep = vi.fn().mockResolvedValue(undefined);
    const res = await fetchQlooWithRetry('https://example.test/insights', 'key', fetchImpl, {
      maxRetries: 2,
      sleep,
    });
    expect(res.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('retries network errors then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const sleep = vi.fn().mockResolvedValue(undefined);
    const res = await fetchQlooWithRetry('https://example.test/insights', 'key', fetchImpl, {
      maxRetries: 2,
      sleep,
    });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws structured QLOO_UNAVAILABLE after retries exhausted', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchQlooWithRetry('https://example.test/insights', 'key', fetchImpl, {
        maxRetries: 1,
        sleep,
      })
    ).rejects.toMatchObject({
      name: 'UpstreamError',
      code: 'QLOO_UNAVAILABLE',
      userMessage: QLOO_UNAVAILABLE_USER_MESSAGE,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable 4xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' });
    const res = await fetchQlooWithRetry('https://example.test/insights', 'key', fetchImpl, {
      maxRetries: 2,
    });
    expect(res.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('classifies retryable statuses', () => {
    expect(isRetryableQlooStatus(429)).toBe(true);
    expect(isRetryableQlooStatus(500)).toBe(true);
    expect(isRetryableQlooStatus(400)).toBe(false);
  });

  it('uses jittered backoff', () => {
    expect(jitteredBackoffMs(0)).toBe(400);
    expect(jitteredBackoffMs(1)).toBe(800);
  });
});

describe('UpstreamError userMessage', () => {
  it('can carry broker-safe copy', () => {
    const err = new UpstreamError('internal', 503);
    err.code = 'QLOO_UNAVAILABLE';
    err.userMessage = QLOO_UNAVAILABLE_USER_MESSAGE;
    expect(err.userMessage).toContain('Try again');
  });
});
