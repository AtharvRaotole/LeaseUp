import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePayload,
  criticalIssues,
  rowPass,
} from './address-sweep-lib.mjs';

describe('address-sweep-lib', () => {
  it('does not flag nearest store outside trade area (absent brands)', () => {
    const issues = analyzePayload(
      {
        location: { latitude: 40.7, longitude: -74, resolvedAddress: 'Test' },
        prospects: [
          {
            brand: { entityId: 'a', name: 'Example Retail' },
            nearestExistingStoreKm: 25,
          },
        ],
        rankings: [{ brandId: 'a' }],
      },
      10
    );
    assert.equal(issues.includes('store_beyond_radius'), false);
  });

  it('flags delegated World Market without failing critical pass', () => {
    const issues = analyzePayload(
      {
        location: { latitude: 40.7, longitude: -74, resolvedAddress: 'Test' },
        prospects: [{ brand: { entityId: 'w', name: 'Cost Plus World Market' } }],
        rankings: [{ brandId: 'w' }],
      },
      10
    );
    assert.ok(issues.includes('suspicious_category_world_market'));
    assert.equal(criticalIssues(issues).length, 0);
  });

  it('rowPass accepts HTTP 200 with only delegated flags', () => {
    assert.ok(
      rowPass(
        { status: 200 },
        { status: 200, issues: ['suspicious_category_world_market'], code: null }
      )
    );
  });
});
