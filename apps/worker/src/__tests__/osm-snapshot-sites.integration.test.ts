import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

const tilesDir = join(__dirname, '../../public/osm-tiles');

const assets = {
  fetch: async (url: string) => {
    const path = url.replace('https://osm.local/osm-tiles/', '');
    const file = join(tilesDir, path);
    try {
      const body = readFileSync(file);
      return new Response(body, { status: 200 });
    } catch {
      return new Response('missing', { status: 404 });
    }
  },
} as unknown as Fetcher;

const db = {
  prepare: () => {
    const stmt = { bind: () => stmt, run: async () => ({}), first: async () => null };
    return stmt;
  },
} as unknown as D1Database;

const kv = { get: async () => null, put: async () => undefined } as unknown as KVNamespace;

function makeService() {
  return new AnalysisService({
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
    ASSETS: assets,
  } as import('../index').Env);
}

describe('OSM snapshot on demo chips', () => {
  it('reports verification mix for Wicker, Boulder, and Sevierville', async () => {
    const service = makeService();
    const summary: Array<Record<string, unknown>> = [];

    for (const [label, address] of Object.entries(DEMO_CHIP_ADDRESSES)) {
      const result = await service.analyze({ address, radius: 10 }, `snap-${label}`, 'ip');
      const verified = result.prospects.filter((p) => p.brand.verified === 'verified (2 sources)').length;
      const single = result.prospects.filter((p) => p.brand.verified === 'unverified (1 source)').length;
      summary.push({
        site: label,
        p10: result.backtest.precisionAt10,
        prospects: result.prospects.length,
        verifiedTwoSource: verified,
        singleSource: single,
      });
    }

    // eslint-disable-next-line no-console
    console.log('osm_snapshot_site_report', JSON.stringify(summary));
    expect(summary.length).toBe(3);
    expect(summary.some((row) => (row.verifiedTwoSource as number) > 0 || (row.singleSource as number) > 0)).toBe(
      true
    );
  });
});
