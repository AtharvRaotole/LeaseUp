import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PortfolioService } from '../services/portfolio';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

const portfolioStore = new Map<string, string>();

const db = {
  prepare: (sql: string) => {
    const stmt = {
      binds: [] as unknown[],
      bind(...args: unknown[]) {
        this.binds = args;
        return this;
      },
      async run() {
        if (sql.includes('INSERT INTO portfolios')) {
          portfolioStore.set(String(this.binds[0]), String(this.binds[1]));
        }
        return {};
      },
      async first() {
        if (sql.includes('SELECT payload FROM portfolios')) {
          const payload = portfolioStore.get(String(this.binds[0]));
          return payload ? { payload } : null;
        }
        if (sql.includes('analysis_runs')) return null;
        return null;
      },
    };
    return stmt;
  },
} as unknown as D1Database;

const kv = {
  get: async () => null,
  put: async () => undefined,
} as unknown as KVNamespace;

function demoEnv() {
  return {
    DB: db,
    CACHE: kv,
    APP_MODE: 'demo',
  } as import('../index').Env;
}

describe('PortfolioService', () => {
  beforeEach(() => {
    portfolioStore.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('nominatim.openstreetmap.org/search')) {
          return {
            ok: true,
            json: async () => [
              {
                lat: '41.9088',
                lon: '-87.6776',
                display_name: 'Wicker Park, Chicago, IL',
                address: { neighbourhood: 'Wicker Park', city: 'Chicago' },
              },
            ],
          };
        }
        if (url.includes('/v2/insights')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ results: { entities: [] } }),
          };
        }
        return { ok: false, status: 404 };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and exports a portfolio csv', async () => {
    const service = new PortfolioService(demoEnv());
    const created = await service.create({
      addresses: [DEMO_CHIP_ADDRESSES.wicker],
    });
    const geocoded = await service.geocodeAll(created.id);
    expect(geocoded.rows[0]?.status).toBe('ready');
    const csv = service.exportCsv(geocoded);
    expect(csv).toContain('input_address');
    expect(csv).toContain('Wicker');
  });
});
