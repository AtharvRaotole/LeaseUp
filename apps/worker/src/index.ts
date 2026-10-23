import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { rateLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { metricsMiddleware } from './middleware/metrics';
import { analysisRouter } from './routes/analysis';
import { healthRouter } from './routes/health';
import { compareRouter } from './routes/compare';
import { brandRouter } from './routes/brand';
import { portfolioRouter } from './routes/portfolio';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS?: Fetcher;
  QLOO_API_KEY?: string;
  QLOO_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  APP_MODE?: string;
  ALLOWED_ORIGINS?: string;
  NOMINATIM_CONTACT?: string;
  GIT_SHA?: string;
  BUILD_TIME?: string;
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

function requestPath(c: Context<{ Bindings: Env }>): string {
  return new URL(c.req.url).pathname;
}

/** Demo fixture/KV reads and health should not consume the analysis budget. */
function skipRateLimit(c: Context<{ Bindings: Env }>): boolean {
  const path = requestPath(c);
  if (path === '/api/health') return true;
  if (c.env.APP_MODE !== 'demo') return false;
  if (path === '/api/compare/flip' || path.startsWith('/api/heatmap')) return true;
  if (path.startsWith('/api/brand') || path === '/api/brands' || path === '/api/metros') return true;
  if (path.startsWith('/api/portfolio')) return true;
  if (path === '/api/analyze/stream' || path === '/api/analyze') return true;
  return false;
}

function isAnalysisPath(path: string): boolean {
  return path === '/api/analyze/stream' || path === '/api/analyze';
}

app.use('/api/*', async (c, next) => {
  if (skipRateLimit(c)) return next();
  const path = requestPath(c);
  if (isAnalysisPath(path)) {
    return rateLimiter({
      windowMs: 60_000,
      maxRequests: 20,
      keyPrefix: 'analyze',
    })(c, next);
  }
  if (path.startsWith('/api/portfolio') && path.endsWith('/run')) {
    return rateLimiter({
      windowMs: 60_000,
      maxRequests: 5,
      keyPrefix: 'portfolio-run',
    })(c, next);
  }
  if (path.startsWith('/api/outreach')) {
    return rateLimiter({
      windowMs: 60_000,
      maxRequests: 5,
      keyPrefix: 'outreach',
    })(c, next);
  }
  return rateLimiter({
    windowMs: 60_000,
    maxRequests: 120,
    keyPrefix: 'global',
  })(c, next);
});

app.route('/api/health', healthRouter);
app.route('/api/compare', compareRouter);
app.route('/api', brandRouter);
app.route('/api', portfolioRouter);
app.route('/api', analysisRouter);

app.onError(errorHandler);

app.notFound((c) => {
  return c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404);
});

export default app;
