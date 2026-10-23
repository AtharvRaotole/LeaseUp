import type { Env } from '../index';

const DEV_PREVIEW_ORIGINS = ['http://localhost:4178', 'http://127.0.0.1:4178'];

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
];

/** Production worker should set ALLOWED_ORIGINS; defaults are local dev only. */
export function allowedOrigins(env: Pick<Env, 'ALLOWED_ORIGINS' | 'APP_MODE'> & { CI?: string }): string[] {
  const configured = env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (configured?.length) return configured;

  const origins = [...DEFAULT_ORIGINS];
  if (env.APP_MODE === 'demo' || env.CI === 'true') {
    origins.push(...DEV_PREVIEW_ORIGINS);
  }
  return origins;
}
