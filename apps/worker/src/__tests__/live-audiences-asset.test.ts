import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../../../..');

describe('live audiences asset', () => {
  it('worker public copy matches the fixtures recording byte for byte', () => {
    const worker = readFileSync(
      join(root, 'apps/worker/public/brand-explainability/live-audiences.compact.json')
    );
    const fixtures = readFileSync(
      join(root, 'packages/fixtures/src/brand-explainability/live-audiences.compact.json')
    );
    expect(worker.equals(fixtures)).toBe(true);
  });
});
