import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { overpassDemoByFixture } from '@leaseup/fixtures';

describe('Overpass demo recordings (anti-fabrication)', () => {
  it('runtime overpass-demo entries must be null or include recordedAt + endpoint metadata', () => {
    for (const [chip, entry] of Object.entries(overpassDemoByFixture)) {
      if (entry === null) continue;
      expect(entry.recordedAt, `${chip} recordedAt`).toBeTruthy();
      expect(entry.endpoint, `${chip} endpoint`).toBeTruthy();
      expect(entry.query, `${chip} query`).toBeTruthy();
      expect(Array.isArray(entry.brands), `${chip} brands`).toBe(true);
    }
  });

  it('generated overpass-demo.ts must not reference synthetic test fixtures', () => {
    const source = readFileSync(
      join(__dirname, '../../../../packages/fixtures/src/overpass-demo.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/synthetic/i);
    expect(source).not.toMatch(/__tests__\/fixtures/);
  });
});
