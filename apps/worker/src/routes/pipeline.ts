import { Hono } from 'hono';
import type { Env } from '../index';
import type { Context } from 'hono';
import { PipelineAddCardSchema, PipelineUpdateCardSchema } from '@leaseup/contracts';
import { PipelineService } from '../services/pipeline';
import { workspaceIdFromRequest } from '../lib/workspace-cookie';

export const pipelineRouter = new Hono<{ Bindings: Env }>();

async function workspaceId(c: Context<{ Bindings: Env }>): Promise<string> {
  return workspaceIdFromRequest(c);
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
