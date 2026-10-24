import { describe, it, expect, vi } from 'vitest';
import { fetchPitchSnapshot } from '../lib/pitch-fetch';

const okBody = { id: 'p1', prospects: [] };

function res(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}

describe('fetchPitchSnapshot', () => {
  it('retries once after a 5xx and then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(res(500, { error: 'boom' }))
      .mockResolvedValueOnce(res(200, okBody));
    const out = await fetchPitchSnapshot('p1', { retryDelayMs: 0, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(out.kind).toBe('ok');
  });

  it('retries once after a network error', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(res(200, okBody));
    const out = await fetchPitchSnapshot('p1', { retryDelayMs: 0, fetchImpl });
    expect(out.kind).toBe('ok');
  });

  it('reports failed after one retry instead of looping', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(503));
    const out = await fetchPitchSnapshot('p1', { retryDelayMs: 0, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(out.kind).toBe('failed');
  });

  it('does not retry a 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(404));
    const out = await fetchPitchSnapshot('p1', { retryDelayMs: 0, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(out.kind).toBe('not-found');
  });
});
