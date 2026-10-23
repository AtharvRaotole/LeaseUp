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
  findStoresNearby,
  getNationalStoreCount,
  getStoreBrandIds,
  computeBacktest,
  blendWithNationalPrior,
  CHAIN_PRIOR_BLEND_WEIGHT,
} from '@leaseup/fixtures';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

export class AnalysisService {
  private qloo: QlooClient;
  private openai: OpenAIClient;
  private overpass: OverpassClient;
  private nominatim: NominatimClient;
  private db: D1Database;
  private mode: 'live' | 'demo';

  constructor(env: Env) {
    this.qloo = new QlooClient(env);
    this.openai = new OpenAIClient(env);
    this.overpass = new OverpassClient(env.CACHE, 5000);
    this.nominatim = new NominatimClient(
      env.CACHE,
      env.NOMINATIM_CONTACT || DEFAULT_NOMINATIM_CONTACT
    );
    this.db = env.DB;
    this.mode = env.APP_MODE === 'live' ? 'live' : 'demo';
  }

  async analyze(request: AnalysisRequest, runId: string, ipHash: string): Promise<AnalysisResponse> {
    await this.db
      .prepare(
        'INSERT INTO analysis_runs (run_id, address, status, ip_address, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(runId, request.address, 'running', ipHash, Math.floor(Date.now() / 1000))
      .run();

    try {
      const location = await this.resolveLocation(request.address);
      const qlooLocation = this.buildQlooLocationQuery(location, request.address);

      const insights = await this.qloo.getBrandInsights({
        location: qlooLocation,
        brandIds: getStoreBrandIds(),
        tags: request.categoryTags,
        take: 50,
        runId,
      });

      if (insights.length === 0) {
        return this.insufficientDataResponse(location, runId);
      }

      const backtest = this.runBacktest(location, insights, request.radius);
      const prospects = await this.generateProspects(location, insights, request.radius, runId);

      const dataQuality = this.assessDataQuality(insights.length, backtest);
      const warnings = this.generateWarnings(insights.length, backtest, location);

      const response: AnalysisResponse = {
        location,
        backtest,
        prospects,
        dataQuality,
        warnings,
        runId,
        timestamp: new Date().toISOString(),
      };

      await this.db
        .prepare('UPDATE analysis_runs SET status = ?, result = ?, latitude = ?, longitude = ? WHERE run_id = ?')
        .bind('completed', JSON.stringify(response), location.latitude, location.longitude, runId)
        .run();

      return response;
    } catch (error) {
      await this.db
        .prepare('UPDATE analysis_runs SET status = ?, error = ? WHERE run_id = ?')
        .bind('failed', (error as Error).message, runId)
        .run();

      throw error;
    }
  }

  private buildQlooLocationQuery(location: Location, address: string): string {
    const fixtureName = this.matchFixtureName(address);
    if (fixtureName) {
      return fixtureName;
    }

    if (location.neighborhood && location.city) {
      return `${location.neighborhood}, ${location.city}`;
    }
    if (location.city) {
      return location.city;
    }
    if (location.resolvedAddress) {
      const parts = location.resolvedAddress.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        return `${parts[0]}, ${parts[1]}`;
      }
    }
    return address;
  }

  private matchFixtureName(address: string): string | null {
    const lower = address.toLowerCase();
    if (lower.includes('wicker') || lower.includes('milwaukee')) {
      return wickerparkFixture.location.name;
    }
    if (lower.includes('sevierville') || lower.includes('collier')) {
      return seviervilleFixture.location.name;
    }
    if (lower.includes('boulder') || lower.includes('pearl')) {
      return boulderFixture.location.name;
    }
    return null;
  }

  private async resolveLocation(address: string): Promise<Location> {
    if (this.mode === 'demo') {
      return this.resolveDemoLocation(address);
    }

    return this.nominatim.geocode(address);
  }

  private resolveDemoLocation(address: string): Location {
    const lowerAddress = address.toLowerCase();

    if (lowerAddress.includes('wicker') || lowerAddress.includes('milwaukee')) {
      return {
        address,
        ...wickerparkFixture.location,
        resolvedAddress: wickerparkFixture.location.name,
      };
    }
    if (lowerAddress.includes('boulder') || lowerAddress.includes('pearl')) {
      return {
        address,
        ...boulderFixture.location,
        resolvedAddress: boulderFixture.location.name,
      };
    }
    if (lowerAddress.includes('sevierville') || lowerAddress.includes('collier')) {
      return {
        address,
        ...seviervilleFixture.location,
        resolvedAddress: seviervilleFixture.location.name,
      };
    }

    return {
      address,
      ...wickerparkFixture.location,
      resolvedAddress: wickerparkFixture.location.name,
    };
  }

  private runBacktest(
    location: Location,
    insights: Array<{ entity_id: string; name: string; query?: { affinity_rank?: number } }>,
    radius: number
  ): BacktestResult {
    const computed = computeBacktest(insights, location.latitude, location.longitude, radius);
    return {
      totalStores: computed.totalStores,
      predictedStores: computed.predictedStores,
      accuracy: computed.accuracy,
      precisionAt10: computed.precisionAt10,
      presentInTop10: computed.presentInTop10,
      auc: computed.auc,
      examples: computed.examples,
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
    const affinities = insights.map((i) => i.query?.affinity ?? 0).filter((a) => a > 0);
    const affinityThreshold = affinityThresholdAtPercentile(affinities, 0.75);

    const candidates = blended.filter((candidate) =>
      isProspectCandidate(candidate, insights.length, affinityThreshold)
    );

    for (const candidate of candidates) {
      const nearbyStores = findStoresNearby(
        candidate.entity_id,
        location.latitude,
        location.longitude,
        radius
      );

      if (nearbyStores.length > 0) {
        continue;
      }

      const nationalCount = getNationalStoreCount(candidate.entity_id);
      if (nationalCount < 5) {
        continue;
      }

      const verification = await this.verifyAbsence(
        location.latitude,
        location.longitude,
        radius,
        candidate.name
      );

      const reasons = this.generateReasons(candidate, location, nationalCount, radius);

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

  private async verifyAbsence(
    lat: number,
    lng: number,
    radiusKm: number,
    brandName: string
  ): Promise<{
    status: 'verified (2 sources)' | 'conflict' | 'unverified (1 source)' | 'unverified';
    sources: string[];
  }> {
    const sources: string[] = ['All The Places (CC0)'];

    const osmResult = await this.overpass.queryBrands(lat, lng, radiusKm);

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
    radius: number
  ): string[] {
    const reasons: string[] = [];
    const total = 50;
    const percentile = 1 - (prospect.qlooRank - 1) / Math.max(total - 1, 1);

    if (percentile >= 0.95) {
      reasons.push(`Top 5% brand affinity in ${location.neighborhood || location.city || 'this area'}`);
    } else if (percentile >= 0.9) {
      reasons.push(`Top 10% brand affinity in ${location.neighborhood || location.city || 'this area'}`);
    } else if (percentile >= 0.85) {
      reasons.push(`Top 15% brand affinity in ${location.neighborhood || location.city || 'this area'}`);
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

    warnings.push('Absence verification is limited to brands in All The Places dataset (47 major chains)');

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
    runId: string
  ): Promise<string> {
    const draft = await this.openai.generateOutreach({
      brandName,
      address,
      reasons,
      runId,
    });

    return `${draft.subject}\n\n${draft.body}`;
  }
}
