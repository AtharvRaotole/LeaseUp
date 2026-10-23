import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const webRoot = path.resolve(import.meta.dirname, '../..');

describe('require-vite-api-url.mjs', () => {
  it('fails the web build when VITE_API_URL is unset', () => {
    expect(() =>
      execSync('node scripts/require-vite-api-url.mjs', {
        cwd: webRoot,
        env: { ...process.env, VITE_API_URL: '', VITE_API_URL_ALLOW_MISSING: '' },
        stdio: 'pipe',
      })
    ).toThrow();
  });

  it('allows missing VITE_API_URL when VITE_API_URL_ALLOW_MISSING=1', () => {
    execSync('node scripts/require-vite-api-url.mjs', {
      cwd: webRoot,
      env: { ...process.env, VITE_API_URL: '', VITE_API_URL_ALLOW_MISSING: '1' },
      stdio: 'pipe',
    });
  });
});
