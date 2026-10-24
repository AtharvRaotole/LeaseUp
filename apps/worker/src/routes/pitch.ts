import { Hono } from 'hono';
import type { Env } from '../index';
import { PitchCreateSchema } from '@leaseup/contracts';
import { PITCH_READ_UNAVAILABLE, PitchService } from '../services/pitch';
import { SHARE_PERSIST_UNAVAILABLE } from '../lib/kv-persistent';

export const pitchRouter = new Hono<{ Bindings: Env }>();

pitchRouter.post('/pitch', async (c) => {
  const body = PitchCreateSchema.parse(await c.req.json());
  const service = new PitchService(c.env);
  try {
    const snapshot = await service.create(body);
    return c.json(snapshot, 201);
  } catch (err) {
    if (err instanceof Error && err.message === SHARE_PERSIST_UNAVAILABLE) {
      return c.json({ error: SHARE_PERSIST_UNAVAILABLE, code: 'SHARE_PERSIST_UNAVAILABLE' }, 503);
    }
    throw err;
  }
});

pitchRouter.get('/pitch/:id', async (c) => {
  const service = new PitchService(c.env);
  let snapshot;
  try {
    snapshot = await service.get(c.req.param('id'));
  } catch (err) {
    if (err instanceof Error && err.message === PITCH_READ_UNAVAILABLE) {
      c.header('Retry-After', '2');
      return c.json({ error: PITCH_READ_UNAVAILABLE, code: 'PITCH_TEMPORARILY_UNAVAILABLE' }, 503);
    }
    throw err;
  }
  if (!snapshot) {
    return c.json({ error: 'Pitch not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(snapshot);
});
