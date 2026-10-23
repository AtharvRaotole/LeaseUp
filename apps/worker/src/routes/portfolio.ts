import { Hono } from 'hono';
import type { Env } from '../index';
import { PortfolioCreateSchema, PortfolioConfirmGeocodeSchema } from '@leaseup/contracts';
import { PortfolioService } from '../services/portfolio';

export const portfolioRouter = new Hono<{ Bindings: Env }>();

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

portfolioRouter.post('/portfolio', async (c) => {
  const body = PortfolioCreateSchema.parse(await c.req.json());
  const service = new PortfolioService(c.env);
  const created = await service.create(body);
  const geocoded = await service.geocodeAll(created.id);
  return c.json(geocoded);
});

portfolioRouter.get('/portfolio/:id', async (c) => {
  const service = new PortfolioService(c.env);
  const portfolio = await service.get(c.req.param('id'));
  if (!portfolio) {
    return c.json({ error: 'Portfolio not found', code: 'NOT_FOUND' }, 404);
  }
  return c.json(portfolio);
});

portfolioRouter.post('/portfolio/:id/confirm', async (c) => {
  const body = PortfolioConfirmGeocodeSchema.parse(await c.req.json());
  const service = new PortfolioService(c.env);
  const portfolio = await service.confirmGeocode(c.req.param('id'), body);
  return c.json(portfolio);
});

portfolioRouter.post('/portfolio/:id/run', async (c) => {
  const id = c.req.param('id');
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const ipHash = await hashIP(ip);
  const service = new PortfolioService(c.env);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  void (async () => {
    try {
      await send('start', { portfolioId: id });
      const portfolio = await service.runAnalyses(id, ipHash, async (row) => {
        await send('row', row);
      });
      await send('complete', portfolio);
    } catch (error) {
      await send('error', { message: (error as Error).message });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});

portfolioRouter.get('/portfolio/:id/export.csv', async (c) => {
  const service = new PortfolioService(c.env);
  const portfolio = await service.get(c.req.param('id'));
  if (!portfolio) {
    return c.json({ error: 'Portfolio not found', code: 'NOT_FOUND' }, 404);
  }
  const csv = service.exportCsv(portfolio);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leaseup-portfolio-${portfolio.id}.csv"`,
    },
  });
});
