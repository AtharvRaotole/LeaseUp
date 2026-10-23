import { describe, it, expect, vi } from 'vitest';
import { rateLimiter } from '../middleware/rate-limit';

describe('rateLimiter', () => {
  it('allows a new window after window_start changes', async () => {
    const rows = new Map<string, { count: number; window_start: number }>();
    const db = {
      prepare: (_sql: string) => {
        const stmt = {
          _bind: [] as unknown[],
          bind(...args: unknown[]) {
            this._bind = args;
            return this;
          },
          async first() {
            const id = this._bind[0] as string;
            const row = rows.get(id);
            return row ? { count: row.count } : null;
          },
          async run() {
            const [id, count, windowStart] = this._bind as [string, number, number];
            rows.set(id, { count, window_start: windowStart });
          },
        };
        return stmt;
      },
    } as unknown as D1Database;

    const middleware = rateLimiter({ windowMs: 60_000, maxRequests: 2, keyPrefix: 'test' });
    const next = vi.fn();

    const makeContext = (_now: number) => ({
      req: { header: () => '203.0.113.1' },
      env: { DB: db },
      header: vi.fn(),
      json: vi.fn(),
    });

    vi.spyOn(Date, 'now').mockReturnValue(0);
    await middleware(makeContext(0) as never, next);
    await middleware(makeContext(0) as never, next);
    expect(next).toHaveBeenCalledTimes(2);

    vi.spyOn(Date, 'now').mockReturnValue(61_000);
    await middleware(makeContext(61_000) as never, next);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
