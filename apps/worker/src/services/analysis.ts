import { QlooClient } from '../providers/qloo';
import { OpenAIClient } from '../providers/openai';
import { OverpassClient } from './overpass';
import { NominatimClient } from './nominatim';
import type { Env } from '../index';
import type {
  AnalysisRequest,
  AnalysisResponse,
  Location,
  BacktestResult,
  ProspectPack,
} from '@leaseup/contracts';
import { affinityThresholdAtPercentile, isProspectCandidate } from '../lib/prospect-filter';
import {
  wickerparkFixture,
  boulderFixture,
  seviervilleFixture,
  blendWithNationalPrior,
  CHAIN_PRIOR_BLEND_WEIGHT,
  matchDemoFixtureId,
} from '@leaseup/fixtures';
import { createStoreCatalog, type StoreCatalog } from './store-catalog';
import type { QlooLocation } from '../providers/qloo';
import { DemoModeRequiredError } from '../lib/demo-mode';
import {
  buildBrandRankings,
  buildDualBacktest,
  buildMapStores,
  enrichProspectsWithNearest,
  extractQlooSignals,
} from '../lib/analysis-enrichment';
import { runStep, type StepEmitter } from '../lib/analysis-steps';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

export class AnalysisService {
  private qloo: QlooClient;
  private openai: OpenAIClient;
  private overpass: OverpassClient;
  private nominatim: NominatimClient;
  private db: D1Database;
  private mode: 'live' | 'demo';
  private catalog: StoreCatalog;

  constructor(env: Env) {
    this.mode = env.APP_MODE === 'live' ? 'live' : 'demo';
    this.qloo = new QlooClient(env);
    this.openai = new OpenAIClient(env);
    this.overpass = new OverpassClient(env.CACHE, 8000, this.mode === 'demo');
    this.nominatim = new NominatimClient(
      env.CACHE,
      env.NOMINATIM_CONTACT || DEFAULT_NOMINATIM_CONTACT
    );
    this.db = env.DB;
    this.catalog = createStoreCatalog(env.DB, this.mode);
  }

  async analyze(request: AnalysisRequest, runId: string, ipHash: string): Promise<AnalysisResponse> {
    return this.analyzeWithSteps(request, runId, ipHash);
  }

  async analyzeWithSteps(
    request: AnalysisRequest,
    runId: string,
    ipHash: string,
    onStep?: StepEmitter
  ): Promise<AnalysisResponse> {
    const emit: StepEmitter = onStep ?? (() => undefined);

    await this.db
      .prepare(
        'INSERT INTO analysis_runs (run_id, address, status, ip_address, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(runId, request.address, 'running', ipHash, Math.floor(Date.now() / 1000))
      .run();

    try {
      const location = await runStep(emit, 'locate', 'Locate storefront', async () => {
        const resolved = await this.resolveLocation(request.address);
        return {
          summary: resolved.resolvedAddress || resolved.address,
          detail: {
            latitude: resolved.latitude,
            longitude: resolved.longitude,
            city: resolved.city,
            neighborhood: resolved.neighborhood,
          },
          result: resolved,
        };
      });

      const qlooLocation = this.buildQlooLocation(location, request.address, request.radius);

      const insights = await runStep(
        emit,
        'taste',
        "Read the neighborhood's taste (Qloo)",
        async () => {
          const rows = await this.qloo.getBrandInsights({
            location: qlooLocation,
            brandIds: this.catalog.getBrandIds(),
            tags: request.categoryTags,
            take: 50,
            runId,
          });
          return {
            summary: `${rows.length} brands ranked for ${this.qlooLocationLabel(qlooLocation)}`,
            detail: { brandCount: rows.length, query: this.qlooLocationLabel(qlooLocation) },
            result: rows,
          };
        }
      );

      if (insights.length === 0) {
        const empty = this.insufficientDataResponse(location, runId);
        await this.persistRun(runId, location, empty, 'completed');
        return empty;
      }

      const { raw: backtest, blended: backtestBlended } = await runStep(
        emit,
        'backtest',
        'Prove it (backtest)',
        async () => {
          const dual = await buildDualBacktest(location, insights, request.radius, this.catalog);
          return {
            summary: `Raw P@10 ${(dual.raw.precisionAt10 * 100).toFixed(0)}% · Blended P@10 ${(dual.blended.precisionAt10 * 100).toFixed(0)}%`,
            detail: {
              rawPrecisionAt10: dual.raw.precisionAt10,
              blendedPrecisionAt10: dual.blended.precisionAt10,
              rawAuc: dual.raw.auc,
              blendedAuc: dual.blended.auc,
            },
            result: dual,
          };
        }
      );

      const prospects = await runStep(
        emit,
        'prospects',
        "Find who's missing",
        async () => {
          const packs = await this.generateProspects(location, insights, request.radius, runId);
          return {
            summary: `${packs.length} high-affinity brands absent in radius`,
            detail: { count: packs.length },
            result: packs,
          };
        }
      );

      await runStep(emit, 'verify', 'Double-check absence (ATP + OSM)', async () => {
        const pending = prospects.filter((p) => p.brand.verified === 'verifying...').length;
        const verified = prospects.filter((p) => p.brand.verified === 'verified (2 sources)').length;
        return {
          summary: pending
            ? `${pending} prospects queued for OpenStreetMap verification (non-blocking)`
            : `${verified} prospects verified by ATP + OpenStreetMap`,
          detail: { verified, pending },
          result: true,
        };
      });

      await runStep(emit, 'outreach_ready', 'Draft outreach (on demand)', async () => ({
        summary: 'Outreach drafts generate on click (never auto-sent)',
        result: true,
      }));

      const rankings = await buildBrandRankings(location, insights, request.radius, this.catalog);
      const mapStores = await buildMapStores(location, insights, request.radius, this.catalog);
      const nearestEnriched = await enrichProspectsWithNearest(prospects, location, this.catalog);
      const enrichedProspects = nearestEnriched.map((pack) => {
        const insight = insights.find((i) => i.entity_id === pack.brand.entityId);
        const signals = insight ? extractQlooSignals(insight) : [];
        return {
          ...pack,
          qlooSignals: signals.length > 0 ? signals : undefined,
        };
      });

      const dataQuality = this.assessDataQuality(insights.length, backtest);
      const warnings = this.generateWarnings(insights.length, backtest, location);

      const response: AnalysisResponse = {
        location,
        backtest,
        backtestBlended,
        rankings,
        mapStores,
        heatmapAvailable: this.mode === 'live',
        prospects: enrichedProspects,
        dataQuality,
        warnings,
        runId,
        timestamp: new Date().toISOString(),
        mode: this.mode,
        chainPriorWeight: CHAIN_PRIOR_BLEND_WEIGHT,
      };

      await this.persistRun(runId, location, response, 'completed');
      return response;
    } catch (error) {
      await this.db
        .prepare('UPDATE analysis_runs SET status = ?, error = ? WHERE run_id = ?')
        .bind('failed', (error as Error).message, runId)
        .run();

      throw error;
    }
  }

  private async persistRun(
    runId: string,
    location: Location,
    response: AnalysisResponse,
    status: string
  ): Promise<void> {
    await this.db
      .prepare('UPDATE analysis_runs SET status = ?, result = ?, latitude = ?, longitude = ? WHERE run_id = ?')
      .bind(status, JSON.stringify(response), location.latitude, location.longitude, runId)
      .run();
  }

  async fetchHeatmapForBrand(
    location: Location,
    radiusKm: number,
    entityId: string,
    runId?: string
  ): Promise<{ cells: Array<{ latitude: number; longitude: number; affinity_rank: number; affinity?: number }> }> {
    const qlooLocation = this.buildQlooLocation(location, location.address, radiusKm);
    const cells = await this.qloo.getHeatmap({
      location: qlooLocation,
      entityId,
      runId,
    });
    return { cells };
  }

  private qlooLocationLabel(location: QlooLocation): string {
    if (location.kind === 'point') {
      return `${location.latitude},${location.longitude} (${location.radiusKm}km)`;
    }
    return location.query;
  }

  private buildQlooLocation(location: Location, address: string, radiusKm: number): QlooLocation {
    if (this.mode === 'demo') {
      const fixtureId = matchDemoFixtureId(address);
      if (!fixtureId) {
        throw new DemoModeRequiredError();
      }
      const fixture =
        fixtureId === 'wicker'
          ? wickerparkFixture
          : fixtureId === 'boulder'
            ? boulderFixture
            : seviervilleFixture;
      return { kind: 'query', query: fixture.location.name };
    }

    return {
      kind: 'point',
      latitude: location.latitude,
      longitude: location.longitude,
      radiusKm,
    };
  }

  private async resolveLocation(address: string): Promise<Location> {
    if (this.mode === 'demo') {
      return this.resolveDemoLocation(address);
    }

    return this.nominatim.geocode(address);
  }

  private resolveDemoLocation(address: string): Location {
    const fixtureId = matchDemoFixtureId(address);
    if (!fixtureId) {
      throw new DemoModeRequiredError();
    }

    const fixture =
      fixtureId === 'wicker'
        ? wickerparkFixture
        : fixtureId === 'boulder'
          ? boulderFixture
          : seviervilleFixture;

    return {
      address,
      ...fixture.location,
      resolvedAddress: fixture.location.name,
    };
  }

  private async generateProspects(
    location: Location,
    insights: Array<{ entity_id: string; name: string; query?: { affinity?: number; affinity_rank?: number } }>,
    radius: number,
    _runId: string
  ): Promise<ProspectPack[]> {
    const prospectPacks: ProspectPack[] = [];
    const blended = blendWithNationalPrior(insights);
    const rankedCount = insights.length;
    const affinities = insights.map((i) => i.query?.affinity ?? 0).filter((a) => a > 0);
    const affinityThreshold = affinityThresholdAtPercentile(affinities, 0.75);

    const candidates = blended.filter((candidate) =>
      isProspectCandidate(candidate, insights.length, affinityThreshold)
    );

    for (const candidate of candidates) {
      const nearbyStores = await this.catalog.findStoresNearby(
        candidate.entity_id,
        location.latitude,
        location.longitude,
        radius
      );

      if (nearbyStores.length > 0) {
        continue;
      }

      const nationalCount = await this.catalog.getNationalStoreCount(candidate.entity_id);
      if (nationalCount < 5) {
        continue;
      }

      const verification =
        this.mode === 'demo'
          ? this.verifyAbsence(
              await this.overpass.queryBrands(
                location.latitude,
                location.longitude,
                radius,
                location.address
              ),
              candidate.name
            )
          : { status: 'verifying...' as const, sources: ['All The Places (CC0)'] };

      const reasons = this.generateReasons(
        candidate,
        location,
        nationalCount,
        radius,
        rankedCount
      );

      prospectPacks.push({
        brand: {
          entityId: candidate.entity_id,
          name: candidate.name,
          affinity: candidate.query?.affinity || 0,
          affinityRank: candidate.qlooRank,
          popularity: undefined,
          verified: verification.status,
          verificationSources: verification.sources,
          nationalStoreCount: nationalCount,
          nearbyStoreCount: 0,
        },
        tenantMixScore: undefined,
        demographics: undefined,
        outreachDraft: '',
        reasons,
      });

      if (prospectPacks.length >= 10) {
        break;
      }
    }

    return prospectPacks;
  }

  async applyOsmVerification(
    location: Location,
    radiusKm: number,
    prospects: ProspectPack[]
  ): Promise<ProspectPack[]> {
    const cached = await this.overpass.queryBrands(
      location.latitude,
      location.longitude,
      radiusKm,
      location.address
    );

    return prospects.map((pack) => {
      if (pack.brand.verified !== 'verifying...') {
        return pack;
      }
      const verification = this.verifyAbsence(cached, pack.brand.name);
      return {
        ...pack,
        brand: {
          ...pack.brand,
          verified: verification.status,
          verificationSources: verification.sources,
        },
      };
    });
  }

  private verifyAbsence(
    osmResult: { brands: Array<{ name: string; brand?: string }>; error?: string },
    brandName: string
  ): {
    status:
      | 'verified (2 sources)'
      | 'conflict'
      | 'unverified (1 source)'
      | 'unverified'
      | 'verifying...';
    sources: string[];
  } {
    const sources: string[] = ['All The Places (CC0)'];

    if (osmResult.error) {
      console.warn(`Overpass fallback (${osmResult.error}): single-source verification`);
      return {
        status: 'unverified (1 source)',
        sources,
      };
    }

    const osmHasBrand = osmResult.brands.some(
      (b) =>
        b.brand?.toLowerCase().includes(brandName.toLowerCase()) ||
        b.name.toLowerCase().includes(brandName.toLowerCase())
    );

    if (osmHasBrand) {
      sources.push('OpenStreetMap (conflict)');
      return {
        status: 'conflict',
        sources,
      };
    }

    sources.push('OpenStreetMap');
    return {
      status: 'verified (2 sources)',
      sources,
    };
  }

  private generateReasons(
    prospect: { name: string; qlooRank: number; query?: { affinity?: number } },
    location: Location,
    nationalCount: number,
    radius: number,
    rankedCount: number
  ): string[] {
    const reasons: string[] = [];
    const affinity = prospect.query?.affinity ?? 0;
    const area = location.neighborhood || location.city || 'this area';

    if (affinity > 0 && rankedCount > 1) {
      const percentile = 1 - (prospect.qlooRank - 1) / (rankedCount - 1);
      if (percentile >= 0.95) {
        reasons.push(`Qloo rank #${prospect.qlooRank} (top 5% of ${rankedCount} brands) in ${area}`);
      } else if (percentile >= 0.9) {
        reasons.push(`Qloo rank #${prospect.qlooRank} (top 10% of ${rankedCount} brands) in ${area}`);
      } else if (percentile >= 0.85) {
        reasons.push(`Qloo rank #${prospect.qlooRank} (top 15% of ${rankedCount} brands) in ${area}`);
      }
    }

    reasons.push(`No existing location within ${radius}km radius (verified via All The Places store data)`);
    reasons.push(
      `Prospect ordering blends Qloo rank with national footprint (weight ${CHAIN_PRIOR_BLEND_WEIGHT}); backtest uses raw Qloo order`
    );

    if (nationalCount >= 100) {
      reasons.push(`Established chain with ${nationalCount} US locations`);
    } else if (nationalCount >= 20) {
      reasons.push(`Growing regional chain with ${nationalCount} US locations`);
    }

    return reasons;
  }

  private assessDataQuality(
    insightCount: number,
    backtest: BacktestResult
  ): 'high' | 'medium' | 'low' | 'insufficient' {
    if (insightCount === 0) return 'insufficient';
    if (insightCount < 10 || backtest.precisionAt10 < 0.5) return 'low';
    if (insightCount < 20 || backtest.precisionAt10 < 0.7) return 'medium';
    return 'high';
  }

  private generateWarnings(
    insightCount: number,
    backtest: BacktestResult,
    location: Location
  ): string[] {
    const warnings: string[] = [];

    if (insightCount < 20) {
      warnings.push('Limited brand data available for this location');
    }

    if (backtest.precisionAt10 < 0.7) {
      warnings.push('Lower prediction confidence - treat as preliminary analysis');
    }

    if (!location.neighborhood && !location.city) {
      warnings.push('Location resolution is approximate');
    }

    warnings.push(
      `Absence verification is limited to brands in the ATP catalog (${this.catalog.getBrandIds().length} chains; seed D1 for full expansion)`
    );

    return warnings;
  }

  private insufficientDataResponse(location: Location, runId: string): AnalysisResponse {
    return {
      location,
      backtest: {
        totalStores: 0,
        predictedStores: 0,
        accuracy: 0,
        precisionAt10: 0,
        presentInTop10: 0,
        auc: 0,
        examples: [],
      },
      prospects: [],
      dataQuality: 'insufficient',
      warnings: [
        'Insufficient Qloo data for this location',
        'This area may be too small, too new, or outside Qloo\'s coverage',
        'Try a nearby larger city or well-known neighborhood',
      ],
      runId,
      timestamp: new Date().toISOString(),
    };
  }

  async generateOutreachForBrand(
    brandName: string,
    address: string,
    reasons: string[],
    runId: string,
    context?: {
      affinityRank?: number;
      neighborhood?: string;
      nearestStoreKm?: number;
    }
  ): Promise<string> {
    const draft = await this.openai.generateOutreach({
      brandName,
      address,
      reasons,
      runId,
      affinityRank: context?.affinityRank,
      neighborhood: context?.neighborhood,
      nearestStoreKm: context?.nearestStoreKm,
    });

    return `${draft.subject}\n\n${draft.body}`;
  }
}
