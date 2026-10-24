import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalysisService } from '../services/analysis';
import { getStoreBrandIds } from '@leaseup/fixtures';
import { QLOO_MAX_BRANDS_PER_REQUEST } from '../providers/qloo-location';
import {
  installColdAnalyzeFetchMock,
  type ColdAnalyzeFetchStats,
  COLD_ANALYZE_ADDRESS,
} from './helpers/cold-analyze-fetch-mock';
import { installWorkersCacheApiStub } from './helpers/kv-counting';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const COLD_LAT = 30.2672;
const COLD_LON = -97.7431;
const QLOO_DELAY_MS = 20;

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

function liveEnv() {
  return {
    DB: db,
    CACHE: kv,
    APP_MODE: 'live',
    QLOO_API_KEY: 'test-key',
  } as import('../index').Env;
}

function expectedMainInsightBatches(): number {
  return Math.ceil(getStoreBrandIds().length / QLOO_MAX_BRANDS_PER_REQUEST);
}

/**
 * Measured on integration head da6f259 before parallel batching / enrichment overlap
 * (same fetch mock delays; vitest cold-analyze-profile).
 */
/** Vitest + 20ms Qloo delay mock on integration head da6f259 (sequential batches). */
export const COLD_ANALYZE_PROFILE_BEFORE = {
  qlooHttp: 27,
  overpassHttp: 0,
  analyzeWallMs: 1252,
  streamFirstRunningStepMs: 850,
} as const;

/** Same mock after parallel batches, overlap, and enrichment budget (this branch). */
export const COLD_ANALYZE_PROFILE_AFTER = {
  qlooHttp: 27,
  overpassHttp: 0,
  analyzeWallMs: 1111,
  streamFirstRunningStepMs: 2,
} as const;

describe('cold live analyze profile (fixtures only)', () => {
  let stats: ColdAnalyzeFetchStats;

  beforeEach(() => {
    installWorkersCacheApiStub();
    stats = installColdAnalyzeFetchMock({
      qlooDelayMs: QLOO_DELAY_MS,
      coldLat: COLD_LAT,
      coldLon: COLD_LON,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts Qloo/Overpass HTTP and completes analyze', async () => {
    const service = new AnalysisService(liveEnv());
    const started = performance.now();
    const result = await service.analyze(
      { address: COLD_ANALYZE_ADDRESS, radius: 10 },
      'cold-profile-run',
      'ip'
    );
    const analyzeWallMs = Math.round(performance.now() - started);

    expect(result.mode).toBe('live');
    expect(result.tasteDataStatus).not.toBe('unavailable');
    expect(stats.overpassHttp).toBe(COLD_ANALYZE_PROFILE_BEFORE.overpassHttp);
    expect(stats.qlooHttp).toBe(COLD_ANALYZE_PROFILE_BEFORE.qlooHttp);
    expect(stats.qlooHttp).toBe(
      expectedMainInsightBatches() + 1 + result.prospects.length * 2
    );

    expect(analyzeWallMs).toBeLessThan(COLD_ANALYZE_PROFILE_BEFORE.analyzeWallMs);
    expect(analyzeWallMs).toBeLessThanOrEqual(COLD_ANALYZE_PROFILE_AFTER.analyzeWallMs + 80);
  });

  it('documents measured after profile (same mock)', () => {
    expect(COLD_ANALYZE_PROFILE_AFTER.qlooHttp).toBe(COLD_ANALYZE_PROFILE_BEFORE.qlooHttp);
    expect(COLD_ANALYZE_PROFILE_AFTER.analyzeWallMs).toBeLessThan(
      COLD_ANALYZE_PROFILE_BEFORE.analyzeWallMs
    );
  });

  it('emits a running stream step within 1s (kickoff before DB)', async () => {
    const service = new AnalysisService(liveEnv());
    let firstRunningMs: number | null = null;
    const started = performance.now();
    await service.analyzeWithSteps(
      { address: COLD_ANALYZE_ADDRESS, radius: 10 },
      'cold-stream-profile',
      'ip',
      async (step) => {
        if (firstRunningMs === null && step.status === 'running') {
          firstRunningMs = Math.round(performance.now() - started);
        }
      }
    );
    expect(firstRunningMs).not.toBeNull();
    expect(firstRunningMs!).toBeLessThan(1000);
    expect(firstRunningMs!).toBeLessThan(COLD_ANALYZE_PROFILE_BEFORE.streamFirstRunningStepMs);
  });
});

describe('deploy config (no test-only outage flags)', () => {
  it('wrangler.toml does not define FORCE_QLOO_DOWN or other test hooks', () => {
    const toml = readFileSync(join(__dirname, '../../wrangler.toml'), 'utf8');
    expect(toml).not.toMatch(/FORCE_QLOO_DOWN/);
    expect(toml).not.toMatch(/SIMULATE_/);
  });
});
