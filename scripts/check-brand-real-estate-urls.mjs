#!/usr/bin/env node
/**
 * CI check: every verified brand-real-estate URL returns HTTP 2xx or 3xx.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(
  readFileSync(join(root, 'packages/fixtures/src/brand-real-estate.json'), 'utf8')
);

async function checkUrl(url) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      let res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers,
      });
      if (res.status === 405) {
        res = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: ctrl.signal,
          headers,
        });
      }
      if (res.status >= 200 && res.status < 400) return res.status;
      if (attempt === 0 && (res.status === 403 || res.status === 429)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return res.status;
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return 0;
    } finally {
      clearTimeout(timer);
    }
  }
  return 0;
}

const verified = data.entries.filter((e) => e.status === 'verified');
if (data.entries.length < 60) {
  console.error(`Expected at least 60 brands in dataset, got ${data.entries.length}`);
  process.exit(1);
}
if (verified.length < 1) {
  console.error('No verified entries in brand-real-estate.json');
  process.exit(1);
}

let failed = 0;
for (const row of verified) {
  const status = await checkUrl(row.url);
  const ok = status >= 200 && status < 400;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${row.name} ${status} ${row.url}`);
  } else {
    console.log(`OK ${status} ${row.name}`);
  }
}

if (failed > 0) {
  console.error(`${failed} verified URL(s) failed`);
  process.exit(1);
}

console.log(`All ${verified.length} verified brand real-estate URLs OK`);
