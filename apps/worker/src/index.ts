import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { rateLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { corsHeadersForRequest } from './middleware/cors-headers';
import { metricsMiddleware } from './middleware/metrics';
import { analysisRouter } from './routes/analysis';
import { healthRouter } from './routes/health';
import { compareRouter } from './routes/compare';
import { brandRouter } from './routes/brand';
import { portfolioRouter } from './routes/portfolio';
import { pitchRouter } from './routes/pitch';
import { prospectingRouter } from './routes/prospecting';
import { geocodeRouter } from './routes/geocode';
import { pipelineRouter } from './routes/pipeline';
import { ownerUpdateRouter } from './routes/owner-update';
import { watchlistRouter } from './routes/watchlist';
import { shareRouter } from './routes/share';
import { allowedOrigins } from './lib/cors-allowed-origins';

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
  /** Test hook: simulate Qloo outage (local/CI only). */
  FORCE_QLOO_DOWN?: string;
  BUILD_TIME?: string;
  CI?: string;
  /** Max live-mode analyzes that call Qloo per UTC day (shared worker key). */
  LIVE_QLOO_JUDGE_DAILY_CAP?: string;
  /** Loopback binding to this Worker (ctx.exports.LiveOffload), set per request, never configured. */
  LIVE_OFFLOAD?: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = allowedOrigins(c.env);
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
  // Recorded demo chip reports are read-only replays: no Qloo, no quota, no D1 writes.
  if (path.startsWith('/api/demo-report/') && c.req.method === 'GET') return true;
  if (c.env.APP_MODE !== 'demo') return false;
  if (path === '/api/compare/flip' || path.startsWith('/api/heatmap')) return true;
  if (path.startsWith('/api/brand') || path === '/api/brands' || path === '/api/metros') return true;
  if (path.startsWith('/api/portfolio')) return true;
  if (path.startsWith('/api/pitch')) return true;
  if (path.startsWith('/api/prospecting')) return true;
  if (path === '/api/geocode') return true;
  if (path.startsWith('/api/pipeline')) return true;
  if (path.startsWith('/api/owner-update')) return true;
  if (path.startsWith('/api/watchlist')) return true;
  if (path === '/api/analyze/stream' || path === '/api/analyze') return true;
  if (path.startsWith('/api/og') || path.startsWith('/api/share')) return true;
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
  if (
    path === '/api/pipeline/cards' &&
    c.req.method === 'POST'
  ) {
    return rateLimiter({
      windowMs: 60_000,
      maxRequests: 40,
      keyPrefix: 'pipeline-add',
    })(c, next);
  }
  if (path === '/api/pipeline/attach-pitch' && c.req.method === 'POST') {
    return rateLimiter({
      windowMs: 60_000,
      maxRequests: 20,
      keyPrefix: 'pipeline-attach-pitch',
    })(c, next);
  }
  if (path.startsWith('/api/pipeline') && path.includes('/outreach')) {
    return rateLimiter({
      windowMs: 60_000,
      maxRequests: 10,
      keyPrefix: 'pipeline-outreach',
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
app.route('/api', pitchRouter);
app.route('/api', prospectingRouter);
app.route('/api', pipelineRouter);
app.route('/api', ownerUpdateRouter);
app.route('/api', watchlistRouter);
app.route('/api', analysisRouter);
app.route('/api', geocodeRouter);
app.route('/api', shareRouter);

app.onError(errorHandler);

app.notFound((c) => {
  return c.json({ error: 'Not Found', code: 'NOT_FOUND' }, 404, corsHeadersForRequest(c));
});

export default app;

export { LiveOffload } from './services/live-offload-handler';
