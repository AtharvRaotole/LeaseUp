import { Hono } from 'hono';
import type { Env } from '../index';
import { METROS } from '../data/metros';
import { BrandReverseService } from '../services/brand-reverse';

export const brandRouter = new Hono<{ Bindings: Env }>();

brandRouter.get('/brands', (c) => {
  const q = c.req.query('q');
  const service = new BrandReverseService(c.env);
  return c.json({ brands: service.listBrands(q) });
});

brandRouter.get('/metros', (c) => {
  return c.json({
    metros: METROS.map((m) => ({ id: m.id, label: m.label })),
  });
});

brandRouter.get('/brand/:entityId/reverse', async (c) => {
  const entityId = c.req.param('entityId');
  const metro = c.req.query('metro') || 'chicago';
  const service = new BrandReverseService(c.env);
  const result = await service.analyze(entityId, metro, `brand-reverse:${entityId}`);
  return c.json(result);
});
