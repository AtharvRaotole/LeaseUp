import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { randomUUID } from 'node:crypto';
import type { Env } from '../index';
import type { Context } from 'hono';
import { PipelineAddCardSchema, PipelineUpdateCardSchema } from '@leaseup/contracts';
import { PipelineService } from '../services/pipeline';

export const pipelineRouter = new Hono<{ Bindings: Env }>();

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

pipelineRouter.get('/pipeline', async (c) => {
  const ws = await workspaceId(c);
  const service = new PipelineService(c.env);
  const board = await service.getOrCreate(ws);
  return c.json(board);
});

pipelineRouter.post('/pipeline/cards', async (c) => {
  const body = PipelineAddCardSchema.parse(await c.req.json());
  const ws = await workspaceId(c);
  const service = new PipelineService(c.env);
  const board = await service.addCard(ws, body);
  return c.json(board, 201);
});

pipelineRouter.patch('/pipeline/cards/:cardId', async (c) => {
  const body = PipelineUpdateCardSchema.parse(await c.req.json());
  const ws = await workspaceId(c);
  const service = new PipelineService(c.env);
  try {
    const board = await service.updateCard(ws, c.req.param('cardId'), body);
    return c.json(board);
  } catch {
    return c.json({ error: 'Card not found', code: 'NOT_FOUND' }, 404);
  }
});

pipelineRouter.post('/pipeline/cards/:cardId/outreach', async (c) => {
  const ws = await workspaceId(c);
  const service = new PipelineService(c.env);
  try {
    const board = await service.generateOutreach(c.env, ws, c.req.param('cardId'));
    return c.json(board);
  } catch {
    return c.json({ error: 'Card not found', code: 'NOT_FOUND' }, 404);
  }
});

pipelineRouter.get('/pipeline/export.csv', async (c) => {
  const ws = await workspaceId(c);
  const service = new PipelineService(c.env);
  const board = await service.getOrCreate(ws);
  const csv = service.exportCsv(board);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leaseup-pipeline.csv"',
    },
  });
});

pipelineRouter.get('/pipeline/public/:shareId', async (c) => {
  const service = new PipelineService(c.env);
  const board = await service.getPublic(c.req.param('shareId'));
  if (!board) {
    return c.json({ error: 'Pipeline not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(board);
});
