import { Hono } from 'hono';
import type { Env } from '../index';

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.get('/', async (c) => {
  const mode = c.env.APP_MODE || 'demo';
  const hasQlooKey = !!c.env.QLOO_API_KEY;
  const hasOpenAIKey = !!c.env.OPENAI_API_KEY;

  return c.json({
    status: 'healthy',
    version: '1.0.0',
    mode,
    providers: {
      qloo: mode === 'live' && hasQlooKey ? 'configured' : 'demo',
      openai: mode === 'live' && hasOpenAIKey ? 'configured' : 'demo',
    },
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/db', async (c) => {
  try {
    const result = await c.env.DB
      .prepare('SELECT 1 as ok')
      .first<{ ok: number }>();
    
    if (result?.ok === 1) {
      return c.json({ status: 'healthy', database: 'connected' });
    }
    
    return c.json({ status: 'unhealthy', database: 'error' }, 503);
  } catch (error) {
    return c.json(
      { 
        status: 'unhealthy', 
        database: 'error',
        error: (error as Error).message,
      },
      503
    );
  }
});
