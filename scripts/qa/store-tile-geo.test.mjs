import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tileStoreCoords } from './store-tile-geo.mjs';

describe('store-tile-geo', () => {
  it('decodes legacy micro-degree tile rows', () => {
    const [lat, lon] = tileStoreCoords(4072483, -7399522);
    assert.ok(Math.abs(lat - 40.72483) < 0.001);
    assert.ok(Math.abs(lon - -73.99522) < 0.001);
  });

  it('passes through degree rows', () => {
    const [lat, lon] = tileStoreCoords(40.72483, -73.99522);
    assert.equal(lat, 40.72483);
    assert.equal(lon, -73.99522);
  });
});
