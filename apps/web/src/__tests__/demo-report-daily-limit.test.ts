import { describe, it, expect, vi, afterEach } from 'vitest';
import { humanizeApiError } from '../lib/api-error';
import {
  calmErrorHeadline,
  calmErrorNextStep,
  dailyLimitMessage,
  nextDailyLimitReset,
} from '../lib/calm-error-copy';
import {
  prefetchDemoReportAnalyze,
  recordedDemoChipId,
  recordedDemoReportUrl,
  takePrefetchedDemoAnalyze,
} from '../lib/report-analyze-prefetch';
import { DEMO_CHIP_ADDRESSES } from '../lib/demo-chip-addresses';

const DASHES = /[\u2013\u2014]/;

describe('daily live search limit copy', () => {
  it('maps the worker quota code to daily limit copy, not a burst rate limit', () => {
    const info = humanizeApiError(429, {
      code: 'LIVE_QLOO_JUDGE_QUOTA_EXCEEDED',
      error: 'Daily live Qloo analyze limit reached for this worker.',
      retryAfter: 13_000,
    });
    expect(info.code).toBe('DAILY_LIMIT_REACHED');
    expect(info.retryAfterSec).toBe(13_000);
    expect(calmErrorHeadline(info)).toBe('Daily search limit reached');
    expect(calmErrorHeadline(info)).not.toMatch(/too many|at once/i);
    expect(info.message).toMatch(/today's limit/);
    expect(info.message).toMatch(/resets at/);
    expect(calmErrorNextStep(info)).toMatch(/demo reports/);
    for (const text of [info.message, calmErrorHeadline(info), calmErrorNextStep(info)]) {
      expect(text).not.toMatch(DASHES);
    }
  });

  it('maps the quota code from the analyze stream error event too', () => {
    const info = humanizeApiError(502, { code: 'LIVE_QLOO_JUDGE_QUOTA_EXCEEDED', retryAfter: 60 });
    expect(info.code).toBe('DAILY_LIMIT_REACHED');
  });

  it('says when the limit resets in the reader time zone', () => {
    const now = Date.UTC(2026, 9, 24, 16, 30);
    expect(nextDailyLimitReset(now).toISOString()).toBe('2026-10-25T00:00:00.000Z');
    const msg = dailyLimitMessage(now, 'America/New_York');
    expect(msg).toContain('8:00 PM EDT');
    expect(msg).toContain('midnight UTC');
    expect(msg).toContain('7 h 30 min');
    expect(msg).not.toMatch(DASHES);
  });

  it('keeps the per minute burst limit copy for RATE_LIMIT_EXCEEDED', () => {
    const info = humanizeApiError(429, { code: 'RATE_LIMIT_EXCEEDED', retryAfter: 30 });
    expect(info.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('recorded demo report requests', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes the three chips at the recorded radius to the read-only GET endpoint', () => {
    for (const [chip, address] of Object.entries(DEMO_CHIP_ADDRESSES)) {
      expect(recordedDemoChipId({ address, radius: 10 })).toBe(chip);
      expect(recordedDemoReportUrl({ address, radius: 10, storefrontSqFt: 2500 })).toMatch(
        new RegExp(`/api/demo-report/${chip}\\?sqft=2500$`)
      );
    }
  });

  it('keeps a legacy spelling of a chip address on the recorded path', () => {
    const url = recordedDemoReportUrl({ address: '1574 N Milwaukee Ave, Chicago, IL 60622', radius: 10 });
    expect(url).toContain('/api/demo-report/wicker?address=1574+N+Milwaukee+Ave');
  });

  it('leaves other searches on the live path', () => {
    expect(recordedDemoReportUrl({ address: '100 Main St, Austin, TX 78701', radius: 10 })).toBeNull();
    expect(recordedDemoReportUrl({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 3 })).toBeNull();
    expect(
      recordedDemoReportUrl({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 10, categoryTags: ['beauty'] })
    ).toBeNull();
  });

  it('prefetches once with GET and hands the same response to the report hook once', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const request = { address: DEMO_CHIP_ADDRESSES.boulder, radius: 10, storefrontSqFt: 2500 };
    prefetchDemoReportAnalyze(request);
    prefetchDemoReportAnalyze(request);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]![1].method).toBe('GET');
    expect(String(calls[0]![0])).toContain('/api/demo-report/boulder');
    const first = takePrefetchedDemoAnalyze(request);
    expect(first).not.toBeNull();
    await first;
    expect(takePrefetchedDemoAnalyze(request)).toBeNull();
  });

  it('never prefetches a POST to /api/analyze', () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    prefetchDemoReportAnalyze({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 25 });
    prefetchDemoReportAnalyze({ address: '100 Main St, Austin, TX 78701', radius: 10 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
