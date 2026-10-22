import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../index';

export function metricsMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next) => {
    const start = Date.now();
    
    await next();
    
    const latency = Date.now() - start;
    c.header('X-Response-Time', `${latency}ms`);
  };
}

export async function recordApiMetric(
  db: D1Database,
  data: {
    runId?: string;
    provider: string;
    endpoint: string;
    statusCode?: number;
    latencyMs: number;
    cached?: boolean;
  }
) {
  await db
    .prepare(
      'INSERT INTO api_metrics (run_id, provider, endpoint, status_code, latency_ms, cached, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      data.runId || null,
      data.provider,
      data.endpoint,
      data.statusCode || null,
      data.latencyMs,
      data.cached ? 1 : 0,
      Math.floor(Date.now() / 1000)
    )
    .run();
}
