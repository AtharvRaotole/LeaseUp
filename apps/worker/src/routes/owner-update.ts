import { Hono } from 'hono';
import type { Env } from '../index';
import {
  OwnerUpdateShareRequestSchema,
  OwnerUpdateSnapshotSchema,
} from '@leaseup/contracts';
import { PipelineService } from '../services/pipeline';
import { buildOwnerUpdateSnapshot, listOwnerUpdateProperties } from '../lib/owner-update';
import { safeKvGet, safeKvPut } from '../lib/safe-kv';

const WORKSPACE_COOKIE = 'leaseup_pipeline_ws';
const KV_PREFIX = 'owner-update:v1:';
const SHARE_TTL_SECONDS = 86400 * 90;

export const ownerUpdateRouter = new Hono<{ Bindings: Env }>();

function workspaceIdFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${WORKSPACE_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

ownerUpdateRouter.get('/owner-update/properties', async (c) => {
  const workspaceId = workspaceIdFromCookie(c.req.header('Cookie'));
  if (!workspaceId) {
    return c.json({ properties: [] });
  }
  const pipeline = new PipelineService(c.env);
  const board = await pipeline.getByWorkspace(workspaceId);
  if (!board) return c.json({ properties: [] });
  return c.json({ properties: listOwnerUpdateProperties(board) });
});

ownerUpdateRouter.get('/owner-update/preview', async (c) => {
  const workspaceId = workspaceIdFromCookie(c.req.header('Cookie'));
  const propertyAddress = c.req.query('propertyAddress')?.trim();
  if (!workspaceId || !propertyAddress) {
    return c.json({ error: 'propertyAddress required', code: 'BAD_REQUEST' }, 400);
  }
  const pipeline = new PipelineService(c.env);
  const board = await pipeline.getByWorkspace(workspaceId);
  if (!board) {
    return c.json({ error: 'Pipeline not found', code: 'NOT_FOUND' }, 404);
  }
  const snapshot = buildOwnerUpdateSnapshot(board, propertyAddress);
  return c.json(snapshot);
});

ownerUpdateRouter.post('/owner-update/share', async (c) => {
  const workspaceId = workspaceIdFromCookie(c.req.header('Cookie'));
  if (!workspaceId) {
    return c.json({ error: 'Pipeline workspace required', code: 'UNAUTHORIZED' }, 401);
  }
  const body = OwnerUpdateShareRequestSchema.parse(await c.req.json());
  const pipeline = new PipelineService(c.env);
  const board = await pipeline.getByWorkspace(workspaceId);
  if (!board) {
    return c.json({ error: 'Pipeline not found', code: 'NOT_FOUND' }, 404);
  }

  const snapshot = buildOwnerUpdateSnapshot(board, body.propertyAddress);
  OwnerUpdateSnapshotSchema.parse(snapshot);

  const stored = await safeKvPut(
    c.env.CACHE,
    `${KV_PREFIX}${snapshot.id}`,
    JSON.stringify(snapshot),
    { expirationTtl: SHARE_TTL_SECONDS }
  );
  if (!stored) {
    return c.json({ error: 'Could not save share link', code: 'UPSTREAM_ERROR' }, 503);
  }

  return c.json({ id: snapshot.id, snapshot });
});

ownerUpdateRouter.get('/owner-update/:id', async (c) => {
  const id = c.req.param('id');
  const raw = await safeKvGet(c.env.CACHE, `${KV_PREFIX}${id}`);
  if (!raw) {
    return c.json({ error: 'Owner update not found', code: 'NOT_FOUND' }, 404);
  }
  try {
    const snapshot = OwnerUpdateSnapshotSchema.parse(JSON.parse(raw));
    return c.json(snapshot);
  } catch {
    return c.json({ error: 'Owner update not found', code: 'NOT_FOUND' }, 404);
  }
});
