import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('wrangler deploy config', () => {
  it('does not define FORCE_QLOO_DOWN (local e2e only via --var / .dev.vars)', () => {
    const toml = readFileSync(join(__dirname, '../../wrangler.toml'), 'utf8');
    expect(toml).not.toMatch(/FORCE_QLOO_DOWN/);
  });
});
