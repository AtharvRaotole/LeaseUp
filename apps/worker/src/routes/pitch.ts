import { Hono } from 'hono';
import type { Env } from '../index';
import { PitchCreateSchema } from '@leaseup/contracts';
import { PitchService } from '../services/pitch';

export const pitchRouter = new Hono<{ Bindings: Env }>();

pitchRouter.post('/pitch', async (c) => {
  const body = PitchCreateSchema.parse(await c.req.json());
  const service = new PitchService(c.env);
  const snapshot = await service.create(body);
  return c.json(snapshot, 201);
});

pitchRouter.get('/pitch/:id', async (c) => {
  const service = new PitchService(c.env);
  const snapshot = await service.get(c.req.param('id'));
  if (!snapshot) {
    return c.json({ error: 'Pitch not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(snapshot);
});
