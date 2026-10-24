import { describe, expect, it } from 'vitest';
import {
  assertRecheckAllowed,
  markRecheckCompleted,
  RecheckCooldownError,
  WATCH_RECHECK_COOLDOWN_SEC,
} from '../lib/watch-recheck-cooldown';

const store = new Map<string, { window_start: number }>();

const db = {
  prepare: (sql: string) => {
    const stmt = {
      binds: [] as unknown[],
      bind(...args: unknown[]) {
        this.binds = args;
        return this;
      },
      async run() {
        if (sql.includes('INSERT INTO rate_limits')) {
          const id = String(this.binds[0]);
          const windowStart = Number(this.binds[1]);
          store.set(id, { window_start: windowStart });
        }
        return {};
      },
      async first() {
        if (sql.includes('SELECT window_start FROM rate_limits')) {
          const row = store.get(String(this.binds[0]));
          return row ? { window_start: row.window_start } : null;
        }
        return null;
      },
    };
    return stmt;
  },
} as unknown as D1Database;

describe('watch recheck cooldown', () => {
  it('allows first recheck', async () => {
    await expect(assertRecheckAllowed(db, 'watch-1', 1000)).resolves.toBeUndefined();
  });

  it('blocks within cooldown window', async () => {
    store.clear();
    await markRecheckCompleted(db, 'watch-2', 5000);
    await expect(assertRecheckAllowed(db, 'watch-2', 5100)).rejects.toThrow(RecheckCooldownError);
    try {
      await assertRecheckAllowed(db, 'watch-2', 5100);
    } catch (err) {
      expect((err as RecheckCooldownError).retryAfterSec).toBe(WATCH_RECHECK_COOLDOWN_SEC - 100);
    }
  });
});
