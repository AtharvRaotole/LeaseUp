import type { Context, ErrorHandler } from 'hono';
import type { Env } from '../index';
import { ZodError } from 'zod';

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
    500 as 500
  );
};
