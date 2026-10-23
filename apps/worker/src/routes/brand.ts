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

brandRouter.get('/brand/:entityId/reverse/stream', async (c) => {
  const entityId = c.req.param('entityId');
  const metro = c.req.query('metro') || 'chicago';
  const service = new BrandReverseService(c.env);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = async (event: string, data: unknown) => {
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      /* client disconnected */
    }
  };

  const run = async () => {
      try {
        const built = await service.buildAnalysis(entityId, metro, `brand-reverse-stream:${entityId}`);
        await send('initial', built);
        await service.fillNeighborhoodsStreaming(
          entityId,
          metro,
          built.opportunities,
          async (row) => {
            await send('neighborhood', row);
          }
        );
        await send('complete', { ok: true });
      } catch (error) {
        await send('error', { message: (error as Error).message });
      } finally {
        try {
          await writer.close();
        } catch {
          /* already closed */
        }
      }
  };

  if (c.executionCtx) {
    c.executionCtx.waitUntil(run());
  } else {
    void run();
  }

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});
