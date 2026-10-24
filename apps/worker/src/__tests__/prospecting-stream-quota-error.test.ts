import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveQlooJudgeQuotaError } from '../lib/live-qloo-judge-quota';
import { prospectingRouter } from '../routes/prospecting';
import { ProspectingService } from '../services/prospecting';

describe('prospecting run stream errors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the daily cap code when the cap is hit after the run started', async () => {
    vi.spyOn(ProspectingService.prototype, 'run').mockRejectedValue(new LiveQlooJudgeQuotaError(3600));
    const pending: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: (p: Promise<unknown>) => pending.push(p),
      passThroughOnException: () => undefined,
    } as unknown as ExecutionContext;

    const res = await prospectingRouter.request(
      '/prospecting/job-1/run',
      { method: 'POST' },
      {} as import('../index').Env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    await Promise.all(pending);

    const errorEvent = body.split('\n\n').find((part) => part.startsWith('event: error'));
    expect(errorEvent).toBeDefined();
    const data = JSON.parse(errorEvent!.split('\n').find((l) => l.startsWith('data:'))!.slice(5));
    expect(data.code).toBe('LIVE_QLOO_JUDGE_QUOTA_EXCEEDED');
    expect(data.retryAfterSec).toBe(3600);
  });
});
