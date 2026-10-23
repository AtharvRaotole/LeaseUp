import { Hono } from 'hono';
import type { Env } from '../index';
import { BUILD_GIT_SHA, BUILD_TIME } from '../build-meta';
import { corsHeadersForRequest } from '../middleware/cors-headers';

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.get('/', async (c) => {
  const mode = c.env.APP_MODE || 'demo';
  const hasQlooKey = !!c.env.QLOO_API_KEY;
  const hasOpenAIKey = !!c.env.OPENAI_API_KEY;
  const gitSha = c.env.GIT_SHA || BUILD_GIT_SHA;
  const buildTime = c.env.BUILD_TIME || BUILD_TIME;

  return c.json({
    status: 'healthy',
    version: '1.0.0',
    mode,
    gitSha,
    buildTime,
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
    
    return c.json({ status: 'unhealthy', database: 'error' }, 503, corsHeadersForRequest(c));
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        database: 'error',
        error: (error as Error).message,
      },
      503,
      corsHeadersForRequest(c)
    );
  }
});
