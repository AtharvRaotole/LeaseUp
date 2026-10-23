import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadPagesHeaders() {
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
  return headers;
}
