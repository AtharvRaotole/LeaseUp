import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { DEMO_PITCH_BOULDER_ULTA } from '@leaseup/fixtures/worker';
import { AnalysisService } from '../services/analysis';
import { PipelineService } from '../services/pipeline';
import { buildPitchPackSnapshot } from '../lib/pitch-snapshot';
import { installWorkersCacheApiStub } from './helpers/kv-counting';
import type { AnalysisResponse } from '@leaseup/contracts';

/** Acronym only (case-sensitive); avoids false positives like run ids containing "atp". */
const ATP_ACRONYM_RE = /\bATP\b/;

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out);
  }
  return out;
}

function assertNoAtpInPayload(label: string, payload: unknown) {
  const hits = collectStrings(payload).filter((s) => ATP_ACRONYM_RE.test(s));
  expect(hits, `${label} contained ATP: ${hits.join(' | ')}`).toEqual([]);
}

const db = {
  prepare: () => {
    const stmt = {
      bind: () => stmt,
      run: async () => ({}),
      first: async () => null,
    };
    return stmt;
  },
} as unknown as D1Database;

const kv = {
  get: async () => null,
  put: async () => undefined,
} as unknown as KVNamespace;

describe('no ATP acronym in API or export copy', () => {
  it('demo analyze responses omit ATP in all string fields', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    for (const address of Object.values(DEMO_CHIP_ADDRESSES)) {
      const result = await service.analyze({ address, radius: 10 }, `no-atp-${address}`, 'ip');
      assertNoAtpInPayload(`analyze ${address}`, result);
      const absenceLine = result.prospects[0]?.reasons.find((r) => /store within/i.test(r));
      expect(absenceLine).toContain('All The Places store data');
    }
  });

  it('demo Boulder pitch snapshot fixture and pitch export omit ATP', () => {
    assertNoAtpInPayload('demo-pitch-boulder-ulta.json', DEMO_PITCH_BOULDER_ULTA);
  });

  it('pitch pack snapshot built from analyze omits ATP', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);
    const results = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.boulder, radius: 10 },
      'no-atp-pitch',
      'ip'
    );
    const snapshot = buildPitchPackSnapshot('00000000-0000-4000-8000-000000000010', {
      results: results as AnalysisResponse,
      radiusKm: 10,
    });
    assertNoAtpInPayload('pitch snapshot', snapshot);
  });

  it('pipeline CSV export omits ATP when cards carry analyze reasons', async () => {
    installWorkersCacheApiStub();
    const analysis = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);
    const results = await analysis.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'no-atp-csv',
      'ip'
    );
    const pack = results.prospects[0]!;
    const env = { DB: db, CACHE: kv, APP_MODE: 'demo' } as import('../index').Env;
    const pipeline = new PipelineService(env);
    const ws = '00000000-0000-4000-8000-000000000099';
    await pipeline.getOrCreate(ws);
    const board = await pipeline.addCard(ws, {
      brandEntityId: pack.brand.entityId,
      brandName: pack.brand.name,
      propertyAddress: results.location.address,
      affinityRank: pack.brand.affinityRank,
      verification: pack.brand.verified,
      outreachContext: { reasons: pack.reasons },
    });
    const csv = pipeline.exportCsv(board);
    expect(csv).not.toMatch(ATP_ACRONYM_RE);
  });
});
