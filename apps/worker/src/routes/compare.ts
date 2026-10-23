import { Hono } from 'hono';
import type { Env } from '../index';
import { getCompareFlip } from '../services/compare-flip';

export const compareRouter = new Hono<{ Bindings: Env }>();

compareRouter.get('/flip', async (c) => {
  const payload = await getCompareFlip(c.env);
  return c.json(payload);
});
