import { loadPagesHeaders } from '../apps/web/load-pages-headers.mjs';

export { loadPagesHeaders };

export function loadContentSecurityPolicy() {
  const headers = loadPagesHeaders();
  const csp = headers['Content-Security-Policy'];
  if (!csp) {
    throw new Error('Missing Content-Security-Policy in apps/web/public/_headers');
  }
  return csp;
}

export function connectSrcAllows(url) {
  const csp = loadContentSecurityPolicy();
  const match = csp.match(/connect-src\s+([^;]+)/);
  if (!match) return false;
  const sources = match[1].trim().split(/\s+/);
  const target = new URL(url);
  for (const src of sources) {
    if (src === "'self'") {
      if (target.origin === 'http://127.0.0.1:4173' || target.origin === 'http://localhost:4173') {
        return true;
      }
      continue;
    }
    if (src.startsWith('https://*.workers.dev')) {
      if (target.hostname.endsWith('.workers.dev')) return true;
      continue;
    }
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const pattern = src.replace(/\./g, '\\.').replace(/\*/g, '.*');
      if (new RegExp(`^${pattern}$`).test(target.origin)) return true;
      if (src === target.origin) return true;
    }
  }
  return false;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(loadPagesHeaders());
}
