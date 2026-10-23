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
import { resolveGeocodeFromCandidates, candidateToLocation } from '../lib/geocode-resolve';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

const STALE_ANALYZING_MS = 60_000;

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

  /** Rows stuck in analyzing (e.g. client disconnected) become ready again after 60s. */
  async resumeStaleAnalyzing(id: string): Promise<PortfolioResponse | null> {
    const portfolio = await this.get(id);
    if (!portfolio) return null;
    const now = Date.now();
    let changed = false;
    for (const row of portfolio.rows) {
      if (row.status !== 'analyzing' || !row.analyzingStartedAt) continue;
      const started = Date.parse(row.analyzingStartedAt);
      if (Number.isFinite(started) && now - started > STALE_ANALYZING_MS) {
        row.status = 'ready';
        row.analyzingStartedAt = undefined;
        changed = true;
      }
    }
    if (changed) await this.save(portfolio);
    return portfolio;
  }

  private async resolveNeighborhood(
    latitude: number,
    longitude: number,
    candidate?: GeocodeCandidate
  ): Promise<string | undefined> {
    if (candidate?.neighborhood) return candidate.neighborhood;
    return this.nominatim.reverseGeocode(latitude, longitude);
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

        const preview = resolveGeocodeFromCandidates(
          row.inputAddress,
          await this.nominatim.geocodeCandidates(row.inputAddress, 5)
        );
        if (preview.needsConfirmation) {
          row.geocodeCandidates = preview.candidates;
          row.status = 'ambiguous';
          continue;
        }
        const pick = preview.candidates[0]!;
        const c0 = preview.location ?? candidateToLocation(row.inputAddress, pick);
        const neighborhood = await this.resolveNeighborhood(c0.latitude, c0.longitude, pick);
        row.location = this.candidateToLocation(row.inputAddress, pick, neighborhood);
        row.neighborhood = neighborhood;
        row.status = 'ready';
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

    const neighborhood = await this.resolveNeighborhood(
      candidate.latitude,
      candidate.longitude,
      candidate
    );
    row.location = this.candidateToLocation(row.inputAddress, candidate, neighborhood);
    row.neighborhood = neighborhood;
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
    await this.resumeStaleAnalyzing(id);
    const portfolio = await this.get(id);
    if (!portfolio) throw new Error('Portfolio not found');

    const analysis = new AnalysisService(this.env);

    for (const row of portfolio.rows) {
      if (row.status !== 'ready') continue;
      if (!row.location) continue;

      row.status = 'analyzing';
      row.analyzingStartedAt = new Date().toISOString();
      await this.save(portfolio);
      if (onRow) {
        try {
          await onRow(row);
        } catch {
          /* SSE client disconnected; keep analyzing in waitUntil */
        }
      }

      try {
        const runId = randomUUID();
        const result = await analysis.analyze(
          {
            address: row.location.address,
            radius: 10,
            confirmedLocation: row.location,
          },
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
        const confirmedHood = row.location.neighborhood ?? row.neighborhood;
        row.neighborhood =
          confirmedHood ??
          result.location.neighborhood ??
          (await this.nominatim.reverseGeocode(
            row.location.latitude,
            row.location.longitude
          ));
        row.status = 'complete';
        row.analyzingStartedAt = undefined;
      } catch (err) {
        row.analyzingStartedAt = undefined;
        if (err instanceof DemoModeRequiredError) {
          row.status = 'error';
          row.error = 'Demo mode only supports the three example addresses.';
        } else {
          row.status = 'error';
          row.error = (err as Error).message;
        }
      }

      await this.save(portfolio);
      if (onRow) {
        try {
          await onRow(row);
        } catch {
          /* SSE client disconnected */
        }
      }
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

  private candidateToLocation(
    inputAddress: string,
    candidate: GeocodeCandidate,
    neighborhood?: string
  ) {
    return {
      address: inputAddress,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      city: candidate.city,
      neighborhood: neighborhood ?? candidate.neighborhood,
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
