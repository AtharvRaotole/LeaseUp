import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { rateLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { metricsMiddleware } from './middleware/metrics';
import { analysisRouter } from './routes/analysis';
import { healthRouter } from './routes/health';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  QLOO_API_KEY?: string;
  QLOO_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  APP_MODE?: string;
  ALLOWED_ORIGINS?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:5173',
        'http://localhost:3000',
      ];
      return allowed.includes(origin) ? origin : allowed[0]!;
    },
    credentials: true,
  })
);

app.use('*', metricsMiddleware());

app.use('/api/*', rateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: 'global',
}));

app.use('/api/analyze', rateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  keyPrefix: 'analyze',
}));

app.route('/api/health', healthRouter);
app.route('/api', analysisRouter);

app.onError(errorHandler);

app.notFound((c) => {
  return c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404);
});

export default app;
