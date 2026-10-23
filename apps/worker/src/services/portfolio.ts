import { randomUUID } from 'node:crypto';
import type {
  GeocodeCandidate,
  PortfolioConfirmGeocode,
  PortfolioCreate,
  PortfolioResponse,
  PortfolioRow,
} from '@leaseup/contracts';
import type { Env } from '../index';
import { AnalysisService } from './analysis';
import { NominatimClient } from './nominatim';
import { displayBrandName } from '../lib/brand-display';
import { DemoModeRequiredError } from '../lib/demo-mode';
import { matchDemoFixtureId } from '@leaseup/fixtures';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

export class PortfolioService {
  private db: D1Database;
  private nominatim: NominatimClient;
  private env: Env;
  private mode: 'live' | 'demo';

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
    this.mode = env.APP_MODE === 'live' ? 'live' : 'demo';
    this.nominatim = new NominatimClient(
      env.CACHE,
      env.NOMINATIM_CONTACT || DEFAULT_NOMINATIM_CONTACT
    );
  }

  async create(input: PortfolioCreate): Promise<PortfolioResponse> {
    const id = randomUUID();
    const rows: PortfolioRow[] = input.addresses.map((address) => ({
      id: randomUUID(),
      inputAddress: address.trim(),
      status: 'pending',
    }));

    const portfolio: PortfolioResponse = {
      id,
      rows,
      createdAt: new Date().toISOString(),
      mode: this.mode,
    };

    await this.save(portfolio);
    return portfolio;
  }

  async get(id: string): Promise<PortfolioResponse | null> {
    const row = await this.db
      .prepare('SELECT payload FROM portfolios WHERE portfolio_id = ?')
      .bind(id)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    return JSON.parse(row.payload) as PortfolioResponse;
  }

  async geocodeAll(id: string): Promise<PortfolioResponse> {
    const portfolio = await this.get(id);
    if (!portfolio) throw new Error('Portfolio not found');

    for (const row of portfolio.rows) {
      if (row.status !== 'pending') continue;
      row.status = 'geocoding';
      try {
        if (this.mode === 'demo' && !matchDemoFixtureId(row.inputAddress)) {
          row.status = 'error';
          row.error = 'Demo mode only supports the three example addresses on the home page.';
          continue;
        }

        const candidates = await this.nominatim.geocodeCandidates(row.inputAddress, 5);
        if (candidates.length === 0) {
          row.status = 'error';
          row.error = 'No match found for this address.';
          continue;
        }
        if (candidates.length === 1) {
          row.location = this.candidateToLocation(row.inputAddress, candidates[0]!);
          row.neighborhood = row.location.neighborhood;
          row.status = 'ready';
        } else {
          row.geocodeCandidates = candidates;
          row.status = 'ambiguous';
        }
      } catch (err) {
        row.status = 'error';
        row.error = (err as Error).message;
      }
    }

    await this.save(portfolio);
    return portfolio;
  }

  async confirmGeocode(id: string, body: PortfolioConfirmGeocode): Promise<PortfolioResponse> {
    const portfolio = await this.get(id);
    if (!portfolio) throw new Error('Portfolio not found');

    const row = portfolio.rows.find((r) => r.id === body.rowId);
    if (!row) throw new Error('Row not found');
    if (!row.geocodeCandidates?.length) throw new Error('Row has no geocode candidates');

    const candidate = row.geocodeCandidates[body.candidateIndex];
    if (!candidate) throw new Error('Invalid candidate index');

    row.location = this.candidateToLocation(row.inputAddress, candidate);
    row.neighborhood = row.location.neighborhood;
    row.status = 'ready';
    row.geocodeCandidates = undefined;

    await this.save(portfolio);
    return portfolio;
  }

  async runAnalyses(
    id: string,
    ipHash: string,
    onRow?: (row: PortfolioRow) => Promise<void>
  ): Promise<PortfolioResponse> {
    const portfolio = await this.get(id);
    if (!portfolio) throw new Error('Portfolio not found');

    const analysis = new AnalysisService(this.env);

    for (const row of portfolio.rows) {
      if (row.status !== 'ready') continue;
      if (!row.location) continue;

      row.status = 'analyzing';
      await this.save(portfolio);
      if (onRow) await onRow(row);

      try {
        const runId = randomUUID();
        const result = await analysis.analyze(
          { address: row.location.address, radius: 10 },
          runId,
          ipHash
        );
        row.runId = result.runId;
        row.topProspects = result.prospects.slice(0, 3).map((p) => ({
          name: displayBrandName(p.brand.entityId, p.brand.name),
          entityId: p.brand.entityId,
          affinityRank: p.brand.affinityRank,
        }));
        row.backtestHitRate = result.backtest.precisionAt10;
        row.neighborhood = result.location.neighborhood ?? row.neighborhood;
        row.status = 'complete';
      } catch (err) {
        if (err instanceof DemoModeRequiredError) {
          row.status = 'error';
          row.error = 'Demo mode only supports the three example addresses.';
        } else {
          row.status = 'error';
          row.error = (err as Error).message;
        }
      }

      await this.save(portfolio);
      if (onRow) await onRow(row);
    }

    return portfolio;
  }

  exportCsv(portfolio: PortfolioResponse): string {
    const header = [
      'input_address',
      'resolved_address',
      'neighborhood',
      'status',
      'backtest_hit_rate',
      'prospect_1',
      'prospect_2',
      'prospect_3',
      'error',
    ];
    const lines = [header.join(',')];
    for (const row of portfolio.rows) {
      const prospects = row.topProspects ?? [];
      const cells = [
        csvEscape(row.inputAddress),
        csvEscape(row.location?.resolvedAddress ?? ''),
        csvEscape(row.neighborhood ?? ''),
        row.status,
        row.backtestHitRate !== undefined ? String(row.backtestHitRate) : '',
        csvEscape(prospects[0]?.name ?? ''),
        csvEscape(prospects[1]?.name ?? ''),
        csvEscape(prospects[2]?.name ?? ''),
        csvEscape(row.error ?? ''),
      ];
      lines.push(cells.join(','));
    }
    return lines.join('\n');
  }

  private candidateToLocation(inputAddress: string, candidate: GeocodeCandidate) {
    return {
      address: inputAddress,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      city: candidate.city,
      neighborhood: candidate.neighborhood,
      resolvedAddress: candidate.resolvedAddress,
    };
  }

  private async save(portfolio: PortfolioResponse): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO portfolios (portfolio_id, payload, created_at) VALUES (?, ?, ?) ' +
          'ON CONFLICT(portfolio_id) DO UPDATE SET payload = excluded.payload'
      )
      .bind(portfolio.id, JSON.stringify(portfolio), Math.floor(Date.now() / 1000))
      .run();
  }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
