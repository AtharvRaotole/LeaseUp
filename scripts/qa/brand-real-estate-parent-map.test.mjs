import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  assertParentPortalAllowed,
  collectParentPortalViolations,
} from '../brand-real-estate-parent-map.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('brand-real-estate parent portal map', () => {
  it('allows Gap Inc. portal only for mapped Gap brands', () => {
    const gap = 'https://www.gapinc.com/en-us/investors/real-estate';
    assert.equal(assertParentPortalAllowed('Old Navy', gap).ok, true);
    assert.equal(assertParentPortalAllowed("Victoria's Secret", gap).ok, false);
  });

  it('brand-real-estate.json verified rows respect parent portal map', () => {
    const data = JSON.parse(
      readFileSync(join(root, 'packages/fixtures/src/brand-real-estate.json'), 'utf8')
    );
    const violations = collectParentPortalViolations(data.entries);
    assert.deepEqual(violations, []);
  });
});
