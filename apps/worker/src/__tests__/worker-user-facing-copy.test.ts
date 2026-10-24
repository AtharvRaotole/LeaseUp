import { describe, it, expect } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import type { AnalysisResponse } from '@leaseup/contracts';
import { installWorkersCacheApiStub } from './helpers/kv-counting';

const UNICODE_DASH = /[\u2013\u2014]/;

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

function collectUserFacingStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUserFacingStrings(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectUserFacingStrings(v, out);
    }
  }
}

function assertNoUnicodeDashesInResponse(response: AnalysisResponse): void {
  const strings: string[] = [];
  collectUserFacingStrings(response, strings);
  const offenders = strings.filter((s) => UNICODE_DASH.test(s));
  expect(offenders).toEqual([]);
}

function assertReasonRanksMatchFields(response: AnalysisResponse): void {
  const rankedCount = response.rankings?.length ?? 0;
  for (const pack of response.prospects) {
    const leaseUpRank = pack.brand.affinityRank;
    expect(pack.reasons[0]).toContain(`LeaseUp rank #${leaseUpRank}`);
    if (rankedCount > 0) {
      expect(pack.reasons[0]).toMatch(/of \d+ brands/);
    }
    const row = response.rankings?.find((r) => r.entityId === pack.brand.entityId);
    if (row && row.qlooRank !== leaseUpRank) {
      expect(pack.reasons[0]).toContain(`Qloo taste rank #${row.qlooRank}`);
    } else if (row) {
      expect(pack.reasons[0]).not.toMatch(/Qloo taste rank/);
    }
  }
}

describe('worker user-facing copy', () => {
  it('demo analyze responses contain no em dash or en dash in emitted strings', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    for (const address of [
      DEMO_CHIP_ADDRESSES.boulder,
      DEMO_CHIP_ADDRESSES.wicker,
      DEMO_CHIP_ADDRESSES.sevierville,
    ]) {
      const result = await service.analyze({ address, radius: 10 }, `dash-${address}`, 'ip');
      assertNoUnicodeDashesInResponse(result);
      assertReasonRanksMatchFields(result);
    }
  });
});
