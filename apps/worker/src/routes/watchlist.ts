import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import type { Env } from '../index';
import { WatchSaveRequestSchema } from '@leaseup/contracts';
import { WatchlistService } from '../services/watchlist';
import { AnalysisService } from '../services/analysis';

export const watchlistRouter = new Hono<{ Bindings: Env }>();

const WORKSPACE_COOKIE = 'leaseup_pipeline_ws';

function cookieSecure(c: Context<{ Bindings: Env }>): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

async function workspaceId(c: Context<{ Bindings: Env }>): Promise<string> {
  const existing = getCookie(c, WORKSPACE_COOKIE);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
    return existing;
  }
  const id = randomUUID();
  setCookie(c, WORKSPACE_COOKIE, id, {
    path: '/',
    httpOnly: true,
    secure: cookieSecure(c),
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 400,
  });
  return id;
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

watchlistRouter.get('/watchlist', async (c) => {
  const ws = await workspaceId(c);
  const service = new WatchlistService(c.env);
  const spaces = await service.list(ws);
  return c.json({ spaces });
});

watchlistRouter.get('/watchlist/:watchId', async (c) => {
  const ws = await workspaceId(c);
  const service = new WatchlistService(c.env);
  const detail = await service.getDetail(c.req.param('watchId'), ws);
  if (!detail) {
    return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(detail);
});

watchlistRouter.post('/watchlist', async (c) => {
  const ws = await workspaceId(c);
  const body = WatchSaveRequestSchema.parse(await c.req.json());
  const service = new WatchlistService(c.env);
  const detail = await service.saveFromReport(ws, body.address, body.radiusKm, body.analysis);
  return c.json({ watchId: detail.watchId, detail });
});

watchlistRouter.post('/watchlist/:watchId/recheck', async (c) => {
  const ws = await workspaceId(c);
  const watchId = c.req.param('watchId');
  const service = new WatchlistService(c.env);
  const existing = await service.getDetail(watchId, ws);
  if (!existing) {
    return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
  }

  const analysisService = new AnalysisService(c.env);
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || '127.0.0.1';
  const ipHash = await hashIP(ip);
  const analysis = await analysisService.analyze(
    { address: existing.address, radius: existing.radiusKm },
    randomUUID(),
    ipHash
  );

  const detail = await service.recheck(watchId, ws, analysis);
  if (!detail) {
    return c.json({ error: 'Watch not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(detail);
});
