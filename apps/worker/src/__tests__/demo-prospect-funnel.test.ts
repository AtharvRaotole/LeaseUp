import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { AnalysisService } from '../services/analysis';
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

describe('demo prospect funnel', () => {
  it('uses adaptive absence radius so dense Wicker is not over-filtered at 10 km', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    const wicker = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'funnel-wicker',
      'ip'
    );
    const boulder = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.boulder, radius: 10 },
      'funnel-boulder',
      'ip'
    );

    expect(wicker.prospectFunnel).toBeDefined();
    expect(wicker.prospectFunnel!.absenceRadiusKm).toBe(3);
    expect(wicker.prospectFunnel!.searchRadiusKm).toBe(10);
    expect(wicker.prospectFunnel!.brandsScored).toBe(224);
    expect(wicker.prospectFunnel!.alreadyNearbyCount).toBe(84);
    expect(wicker.prospects.length).toBeGreaterThan(4);
    expect(boulder.prospects.length).toBeGreaterThanOrEqual(6);

    expect(wicker.prospectFunnel!.alreadyNearbyCount).toBeGreaterThan(
      boulder.prospectFunnel!.alreadyNearbyCount ?? 0
    );
    expect(wicker.prospectFunnel!.pitchedCount).toBe(wicker.prospects.length);

    const withoutStore =
      wicker.prospectFunnel!.brandsScored - wicker.prospectFunnel!.alreadyNearbyCount;
    expect(wicker.prospectFunnel!.pitchedCount).toBeLessThanOrEqual(withoutStore);
    expect(wicker.prospectFunnel!.strongFitAbsentCount).toBeLessThanOrEqual(withoutStore);
    expect(
      wicker.prospectFunnel!.alreadyNearbyCount + withoutStore
    ).toBe(wicker.prospectFunnel!.brandsScored);
  });

  it('funnel counts are internally consistent', async () => {
    installWorkersCacheApiStub();
    const service = new AnalysisService({
      DB: db,
      CACHE: kv,
      APP_MODE: 'demo',
    } as import('../index').Env);

    const result = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 },
      'funnel-consistency',
      'ip'
    );
    const funnel = result.prospectFunnel!;
    expect(funnel.strongFitAbsentCount).toBeGreaterThanOrEqual(funnel.pitchedCount);
    const withoutStore = funnel.brandsScored - funnel.alreadyNearbyCount;
    expect(funnel.pitchedCount).toBeLessThanOrEqual(withoutStore);
    expect(funnel.alreadyNearbyCount + withoutStore).toBe(funnel.brandsScored);
    expect(JSON.stringify(funnel)).not.toMatch(UNICODE_DASH);
  });
});
