import type { Context, ErrorHandler } from 'hono';
import type { Env } from '../index';
import { ZodError } from 'zod';
import { ConfigurationError, GeocodeAmbiguousError, UpstreamError } from '../lib/errors';

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err: Error, c: Context<{ Bindings: Env }>) => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
      400
    );
  }

  if (err instanceof ConfigurationError) {
    return c.json(
      {
        error: err.message,
        code: 'CONFIGURATION_ERROR',
      },
      503
    );
  }

  if (err instanceof GeocodeAmbiguousError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
        candidates: err.candidates,
      },
      409
    );
  }

  if (err instanceof UpstreamError) {
    const status = err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502;
    return c.json(
      {
        error: err.message,
        code: 'UPSTREAM_ERROR',
      },
      status as 502 | 503
    );
  }

  if (err.name === 'HTTPException') {
    const httpErr = err as { status?: number; message: string };
    const status = httpErr.status || 500;
    return c.json(
      {
        error: httpErr.message,
        code: 'HTTP_ERROR',
      },
      status >= 400 && status < 600 ? (status as 400 | 401 | 403 | 404 | 500 | 503) : 500
    );
  }

  return c.json(
    {
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500 as const
  );
};
