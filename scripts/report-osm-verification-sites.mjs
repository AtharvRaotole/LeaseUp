#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tilesDir = join(root, 'apps/worker/public/osm-tiles');

const DEMO_CHIP_ADDRESSES = {
  wicker: '1574 N Milwaukee Ave, Chicago, IL 60622',
  boulder: '1125 Pearl St, Boulder, CO 80302',
  sevierville: '125 Collier Dr, Sevierville, TN 37862',
};

const assets = {
  fetch: async (url) => {
    const path = url.replace('https://osm.local/osm-tiles/', '');
    const file = join(tilesDir, path);
    try {
      const body = readFileSync(file);
      return new Response(body, { status: 200 });
    } catch {
      return new Response('missing', { status: 404 });
    }
  },
};

const db = {
  prepare: () => {
    const stmt = { bind: () => stmt, run: async () => ({}), first: async () => null };
    return stmt;
  },
};

const kv = { get: async () => null, put: async () => undefined };

async function main() {
  const { AnalysisService } = await import('../apps/worker/dist/services/analysis.js');
  const service = new AnalysisService({
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
    ASSETS: assets,
  });

  const sites = [
    { label: 'Wicker', address: DEMO_CHIP_ADDRESSES.wicker },
    { label: 'Boulder', address: DEMO_CHIP_ADDRESSES.boulder },
    { label: 'Sevierville', address: DEMO_CHIP_ADDRESSES.sevierville },
    { label: 'Denver 1600 Pearl', address: '1600 Pearl St, Denver, CO 80203' },
  ];

  const report = [];
  for (const site of sites) {
    try {
      const result = await service.analyze({ address: site.address, radius: 10 }, `osm-report-${site.label}`, 'local');
      const verified = result.prospects.filter((p) => p.brand.verified === 'verified (2 sources)').length;
      const single = result.prospects.filter((p) => p.brand.verified === 'unverified (1 source)').length;
      report.push({
        site: site.label,
        p10: result.backtest.precisionAt10,
        prospectCount: result.prospects.length,
        verifiedTwoSource: verified,
        singleSource: single,
      });
    } catch (err) {
      report.push({ site: site.label, error: err?.message ?? String(err) });
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
