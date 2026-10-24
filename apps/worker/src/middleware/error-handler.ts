import type { Context, ErrorHandler } from 'hono';
import type { Env } from '../index';
import { ZodError } from 'zod';
import {
  ConfigurationError,
  GeocodeAmbiguousError,
  GeocodeInputError,
  GeocodeNotFoundError,
  UpstreamError,
} from '../lib/errors';
import { corsHeadersForRequest } from './cors-headers';

function jsonError(
  c: Context<{ Bindings: Env }>,
  body: Record<string, unknown>,
  status: 400 | 404 | 409 | 500 | 502 | 503
) {
  return c.json(body, status, corsHeadersForRequest(c));
}

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err: Error, c: Context<{ Bindings: Env }>) => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return jsonError(
      c,
      {
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
      400
    );
  }

  if (err instanceof ConfigurationError) {
    return jsonError(
      c,
      {
        error: err.message,
        code: 'CONFIGURATION_ERROR',
      },
      503
    );
  }

  if (err instanceof GeocodeAmbiguousError) {
    return jsonError(
      c,
      {
        error: err.message,
        code: err.code,
        candidates: err.candidates,
      },
      409
    );
  }

  if (err instanceof GeocodeNotFoundError) {
    return jsonError(
      c,
      {
        error: err.message,
        code: err.code,
      },
      404
    );
  }

  if (err instanceof GeocodeInputError) {
    return jsonError(
      c,
      {
        error: err.message,
        code: err.code,
      },
      400
    );
  }

  if (err instanceof UpstreamError) {
    const status = err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502;
    return jsonError(
      c,
      {
        error: err.userMessage ?? err.message,
        code: err.code ?? 'UPSTREAM_ERROR',
      },
      status === 503 ? 503 : 502
    );
  }

  if (err.name === 'HTTPException') {
    const httpErr = err as { status?: number; message: string };
    const status = httpErr.status || 500;
    const httpStatus =
      status === 404 ? 404 : status === 400 ? 400 : status >= 500 ? (status === 503 ? 503 : 500) : 500;
    return jsonError(
      c,
      {
        error: httpErr.message,
        code: 'HTTP_ERROR',
      },
      httpStatus
    );
  }

  return jsonError(
    c,
    {
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
};
