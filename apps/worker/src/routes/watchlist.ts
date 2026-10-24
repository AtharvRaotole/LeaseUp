import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { Env } from '../index';
import { WatchSaveRequestSchema } from '@leaseup/contracts';
import { WatchlistService } from '../services/watchlist';
import { AnalysisService } from '../services/analysis';
import { visitorIdFromRequest } from '../lib/visitor-cookie';
import { RecheckCooldownError } from '../lib/watch-recheck-cooldown';
import {
  assertVisitorRecheckKvAllowed,
  recordVisitorRecheckKv,
  RecheckDailyLimitError,
} from '../lib/watch-recheck-kv-limit';

/**
 * Watchlist rows are scoped by anonymous visitor id (httpOnly cookie leaseup_visitor_id).
 * workspace_id in D1 stores that visitor UUID.
 */
export const watchlistRouter = new Hono<{ Bindings: Env }>();

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

watchlistRouter.get('/watchlist', async (c) => {
  const visitorId = await visitorIdFromRequest(c);
  const service = new WatchlistService(c.env);
  const spaces = await service.list(visitorId);
  return c.json({ spaces });
});

watchlistRouter.get('/watchlist/:watchId', async (c) => {
  const visitorId = await visitorIdFromRequest(c);
  const service = new WatchlistService(c.env);
  const detail = await service.getDetail(c.req.param('watchId'), visitorId);
  if (!detail) {
    return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(detail);
});

watchlistRouter.post('/watchlist', async (c) => {
  const visitorId = await visitorIdFromRequest(c);
  const body = WatchSaveRequestSchema.parse(await c.req.json());
  const service = new WatchlistService(c.env);
  const detail = await service.saveFromReport(visitorId, body.address, body.radiusKm, body.analysis);
  return c.json({ watchId: detail.watchId, detail });
});

watchlistRouter.delete('/watchlist/:watchId', async (c) => {
  const visitorId = await visitorIdFromRequest(c);
  const service = new WatchlistService(c.env);
  const removed = await service.remove(c.req.param('watchId'), visitorId);
  if (!removed) {
    return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json({ ok: true });
});

watchlistRouter.post('/watchlist/:watchId/recheck', async (c) => {
  const visitorId = await visitorIdFromRequest(c);
  const watchId = c.req.param('watchId');
  const service = new WatchlistService(c.env);
  const nowMs = Date.now();
  try {
    const target = await service.assertRecheckAllowedForWatchAsync(watchId, visitorId);
    if (!target) {
      return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
    }

    await assertVisitorRecheckKvAllowed(c.env.CACHE, visitorId, nowMs);

    const analysisService = new AnalysisService(c.env);
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '127.0.0.1';
    const ipHash = await hashIP(ip);
    const analysis = await analysisService.analyze(
      { address: target.address, radius: target.radiusKm },
      randomUUID(),
      ipHash
    );

    const detail = await service.recheck(watchId, visitorId, analysis);
    if (!detail) {
      return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
    }
    await recordVisitorRecheckKv(c.env.CACHE, visitorId, nowMs);
    return c.json(detail);
  } catch (err) {
    if (err instanceof RecheckCooldownError) {
      c.header('Retry-After', String(err.retryAfterSec));
      return c.json(
        {
          error: 'Wait before rechecking this space again.',
          code: 'RECHECK_COOLDOWN',
          retryAfter: err.retryAfterSec,
        },
        429
      );
    }
    if (err instanceof RecheckDailyLimitError) {
      c.header('Retry-After', String(err.retryAfterSec));
      return c.json(
        {
          error: 'Daily recheck limit reached. Try again tomorrow.',
          code: 'RECHECK_DAILY_LIMIT',
          retryAfter: err.retryAfterSec,
        },
        429
      );
    }
    throw err;
  }
});
