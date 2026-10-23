import { createElement } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CompareUnavailable,
  fetchCompareFlipData,
  isComparePayload,
} from '../components/report/CompareSection';

describe('CompareSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects error JSON bodies from compare flip', () => {
    expect(isComparePayload({ error: 'upstream' })).toBe(false);
  });

  it('fetchCompareFlipData returns failed on 502', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'upstream' }),
    });

    const result = await fetchCompareFlipData(fetchMock as typeof fetch, '/api/compare/flip');
    expect(result).toEqual({ ok: false });
  });

  it('CompareUnavailable renders fallback copy', () => {
    const html = renderToStaticMarkup(createElement(CompareUnavailable));
    expect(html).toContain('Comparison unavailable right now.');
  });
});
