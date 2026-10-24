#!/usr/bin/env node
/**
 * Regenerate data/qloo-eval-40/FALSE_POSITIVE_AUDIT.md from worker vitest audit.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const result = spawnSync(
  'pnpm',
  [
    '--filter',
    '@leaseup/worker',
    'exec',
    'vitest',
    'run',
    'src/__tests__/false-positive-prospect-audit.test.ts',
  ],
  {
    cwd: root,
    env: { ...process.env, WRITE_FALSE_POSITIVE_AUDIT: '1' },
    stdio: 'inherit',
  }
);
process.exit(result.status ?? 1);
