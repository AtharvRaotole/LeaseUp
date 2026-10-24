import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../index';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

/**
 * Hash an IP address using SHA-256 (privacy: don't store raw IPs)
 */
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export function rateLimiter(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next) => {
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const ipHash = await hashIP(ip);
    const now = Date.now();
    const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
    const key = `${options.keyPrefix}:${ipHash}:${windowStart}`;

    const db = c.env.DB;

    let existing: { count: number } | null;
    try {
      existing = await db
        .prepare('SELECT count FROM rate_limits WHERE id = ?')
        .bind(key)
        .first<{ count: number }>();
    } catch (err) {
      // Fail open: a transient D1 error in the limiter must not turn a read into a 500.
      console.warn(
        JSON.stringify({ event: 'rate_limit_db_failed', message: (err as Error).message })
      );
      return next();
    }

    if (existing && existing.count >= options.maxRequests) {
      const retrySec = Math.max(1, Math.ceil((windowStart + options.windowMs - now) / 1000));
      c.header('Retry-After', String(retrySec));
      return c.json(
        {
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retrySec,
        },
        429
      );
    }

    const count = existing ? existing.count + 1 : 1;
    
    try {
      await db
        .prepare(
          'INSERT INTO rate_limits (id, count, window_start, created_at) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(id) DO UPDATE SET count = ?'
        )
        .bind(key, count, windowStart, Math.floor(now / 1000), count)
        .run();
    } catch (err) {
      console.warn(
        JSON.stringify({ event: 'rate_limit_db_failed', message: (err as Error).message })
      );
    }

    c.header('X-RateLimit-Limit', options.maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, options.maxRequests - count).toString());
    c.header('X-RateLimit-Reset', new Date(windowStart + options.windowMs).toISOString());

    return next();
  };
}
