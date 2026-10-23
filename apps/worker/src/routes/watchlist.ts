import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { Env } from '../index';
import { WatchSaveRequestSchema } from '@leaseup/contracts';
import { WatchlistService } from '../services/watchlist';
import { AnalysisService } from '../services/analysis';
import { workspaceIdFromRequest } from '../lib/workspace-cookie';
import { RecheckCooldownError } from '../lib/watch-recheck-cooldown';

/**
 * Watchlist rows are scoped by anonymous workspace id (httpOnly cookie leaseup_pipeline_ws,
 * same as pipeline). Every query filters workspace_id so one browser never sees another list.
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
  const ws = await workspaceIdFromRequest(c);
  const service = new WatchlistService(c.env);
  const spaces = await service.list(ws);
  return c.json({ spaces });
});

watchlistRouter.get('/watchlist/:watchId', async (c) => {
  const ws = await workspaceIdFromRequest(c);
  const service = new WatchlistService(c.env);
  const detail = await service.getDetail(c.req.param('watchId'), ws);
  if (!detail) {
    return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(detail);
});

watchlistRouter.post('/watchlist', async (c) => {
  const ws = await workspaceIdFromRequest(c);
  const body = WatchSaveRequestSchema.parse(await c.req.json());
  const service = new WatchlistService(c.env);
  const detail = await service.saveFromReport(ws, body.address, body.radiusKm, body.analysis);
  return c.json({ watchId: detail.watchId, detail });
});

watchlistRouter.post('/watchlist/:watchId/recheck', async (c) => {
  const ws = await workspaceIdFromRequest(c);
  const watchId = c.req.param('watchId');
  const service = new WatchlistService(c.env);
  try {
    const target = await service.assertRecheckAllowedForWatchAsync(watchId, ws);
    if (!target) {
      return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
    }

    const analysisService = new AnalysisService(c.env);
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '127.0.0.1';
    const ipHash = await hashIP(ip);
    const analysis = await analysisService.analyze(
      { address: target.address, radius: target.radiusKm },
      randomUUID(),
      ipHash
    );

    const detail = await service.recheck(watchId, ws, analysis);
    if (!detail) {
      return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
    }
    return c.json(detail);
  } catch (err) {
    if (err instanceof RecheckCooldownError) {
      c.header('Retry-After', String(err.retryAfterSec));
      return c.json(
        {
          error: 'Recheck is limited to once every 10 minutes for this space.',
          code: 'RECHECK_COOLDOWN',
          retryAfter: err.retryAfterSec,
        },
        429
      );
    }
    throw err;
  }
});
