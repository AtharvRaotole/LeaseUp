#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const headersPath = join(repoRoot, 'apps/web/public/_headers');
const apiOrigin = (process.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
if (!apiOrigin) {
  console.error('ERROR: VITE_API_URL is required to verify CSP connect-src includes the API origin.');
  process.exit(1);
}

const raw = readFileSync(headersPath, 'utf8');
const cspLine = raw
  .split('\n')
  .map((l) => l.trim())
  .find((l) => l.startsWith('Content-Security-Policy:'));
if (!cspLine) {
  console.error('ERROR: Content-Security-Policy missing from apps/web/public/_headers');
  process.exit(1);
}

const csp = cspLine.replace(/^Content-Security-Policy:\s*/, '');
const connectMatch = csp.match(/connect-src\s+([^;]+)/);
if (!connectMatch) {
  console.error('ERROR: connect-src directive missing from CSP');
  process.exit(1);
}

const connectSources = connectMatch[1].trim().split(/\s+/);
if (!connectSources.includes(apiOrigin)) {
  console.error(
    `ERROR: connect-src must include VITE_API_URL origin ${apiOrigin}; got: ${connectSources.join(' ')}`
  );
  process.exit(1);
}

const imgMatch = csp.match(/img-src\s+([^;]+)/);
if (!imgMatch || !imgMatch[1].includes(apiOrigin)) {
  console.error(`ERROR: img-src must include API origin ${apiOrigin} (for worker OG tiles).`);
  process.exit(1);
}

console.log(`CSP OK: connect-src and img-src include ${apiOrigin}`);
