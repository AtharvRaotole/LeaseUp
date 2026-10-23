import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_WORKER_ORIGIN = 'https://leaseup-worker.issue-atharva.workers.dev';

function apiOriginFromEnv() {
  const fromEnv = (process.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
  return fromEnv || DEFAULT_WORKER_ORIGIN;
}

const LOCAL_CONNECT = [
  'http://127.0.0.1:8787',
  'http://localhost:8787',
  'http://127.0.0.1:8790',
  'http://localhost:8790',
];

function patchCspDirective(policy, directive, extraSources) {
  const re = new RegExp(`${directive}\\s+([^;]+)`);
  const match = policy.match(re);
  if (!match) return policy;
  const sources = new Set(match[1].trim().split(/\s+/));
  for (const s of extraSources) sources.add(s);
  return policy.replace(re, `${directive} ${[...sources].join(' ')}`);
}

/**
 * @param {{ localPreview?: boolean }} opts
 * localPreview adds localhost worker origins for vite preview + CSP e2e (not for production _headers).
 */
export function loadPagesHeaders(opts = {}) {
  const raw = readFileSync(join(__dirname, 'public/_headers'), 'utf8');
  const lines = raw.split('\n');
  const headers = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '/*' || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    headers[key] = value;
  }

  let csp = headers['Content-Security-Policy'];
  if (csp) {
    const apiOrigin = apiOriginFromEnv();
    csp = patchCspDirective(csp, 'connect-src', [apiOrigin]);
    csp = patchCspDirective(csp, 'img-src', [apiOrigin]);
    if (opts.localPreview) {
      csp = patchCspDirective(csp, 'connect-src', LOCAL_CONNECT);
      csp = patchCspDirective(csp, 'img-src', LOCAL_CONNECT);
    }
    headers['Content-Security-Policy'] = csp;
  }

  return headers;
}

export { DEFAULT_WORKER_ORIGIN as WORKER_ORIGIN };
