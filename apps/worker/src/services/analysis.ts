import { QlooClient, type QlooInsight } from '../providers/qloo';
import { OpenAIClient } from '../providers/openai';
import { OverpassClient } from './overpass';
import type { Env } from '../index';
import type {
  AnalysisRequest,
  AnalysisResponse,
  Location,
  BacktestResult,
  ProspectPack,
} from '@leaseup/contracts';
import {
  wickerparkFixture,
  boulderFixture,
  seviervilleFixture,
  findStoresNearby,
  getNationalStoreCount,
} from '@leaseup/fixtures';

export class AnalysisService {
  private qloo: QlooClient;
  private openai: OpenAIClient;
  private overpass: OverpassClient;
  private db: D1Database;
  private mode: 'live' | 'demo';

  constructor(env: Env) {
    this.qloo = new QlooClient(env);
    this.openai = new OpenAIClient(env);
    this.overpass = new OverpassClient(env.CACHE, 5000);
    this.db = env.DB;
    this.mode = (env.APP_MODE === 'live') ? 'live' : 'demo';
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
      
      const insights = await this.qloo.getBrandInsights({
        location: location.resolvedAddress || location.address,
        tags: request.categoryTags,
        take: 50,
        runId,
      });

      if (insights.length === 0) {
        return this.insufficientDataResponse(location, runId);
      }

      // Real backtest using actual presence data
      const backtest = await this.runBacktest(location, insights, request.radius, runId);
      
      // Real absence verification
      const prospects = await this.generateProspects(
        location,
        insights,
        request.radius,
        runId
      );

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

  private async resolveLocation(address: string): Promise<Location> {
    if (this.mode === 'demo') {
      return this.resolveDemoLocation(address);
    }

    // Nominatim geocoding with proper User-Agent
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LeaseUp/1.0 (hackathon@example.com)',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to geocode address');
    }

    const results = await response.json() as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: {
        city?: string;
        town?: string;
        suburb?: string;
        neighbourhood?: string;
      };
    }>;

    if (results.length === 0) {
      throw new Error('Address not found');
    }

    const result = results[0]!;
    
    return {
      address,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: result.address?.city || result.address?.town,
      neighborhood: result.address?.neighbourhood || result.address?.suburb,
      resolvedAddress: result.display_name,
    };
  }

  private resolveDemoLocation(address: string): Location {
    const lowerAddress = address.toLowerCase();
    
    if (lowerAddress.includes('wicker') || lowerAddress.includes('milwaukee')) {
      return {
        address,
        ...wickerparkFixture.location,
        resolvedAddress: wickerparkFixture.location.name,
      };
    } else if (lowerAddress.includes('boulder') || lowerAddress.includes('pearl')) {
      return {
        address,
        ...boulderFixture.location,
        resolvedAddress: boulderFixture.location.name,
      };
    } else if (lowerAddress.includes('sevierville') || lowerAddress.includes('collier')) {
      return {
        address,
        ...seviervilleFixture.location,
        resolvedAddress: seviervilleFixture.location.name,
      };
    }
    
    // Default to Wicker Park
    return {
      address,
      ...wickerparkFixture.location,
      resolvedAddress: wickerparkFixture.location.name,
    };
  }

  /**
   * Run backtest: compare Qloo ranks to actual store presence
   * Methodology from round2/neigh_test.py:
   * - AUC: How well ranks separate present from absent brands
   * - P@10: What fraction of top-10 ranked brands are actually present
   */
  private async runBacktest(
    location: Location,
    insights: Array<{ entity_id: string; name: string; query?: { affinity_rank?: number } }>,
    radius: number,
    _runId: string
  ): Promise<BacktestResult> {
    if (this.mode === 'demo') {
      return this.getDemoBacktest(location);
    }

    // Find which brands are actually present within radius
    const presentBrands = new Set<string>();
    const examples: BacktestResult['examples'] = [];

    for (const insight of insights) {
      const nearby = findStoresNearby(insight.entity_id, location.latitude, location.longitude, radius);
      
      if (nearby.length > 0) {
        presentBrands.add(insight.entity_id);
        
        // Record for examples
        if (examples.length < 10) {
          examples.push({
            name: insight.name,
            distance: nearby[0]!.distance,
            rank: insights.indexOf(insight) + 1,
            predicted: true,
          });
        }
      }
    }

    // Precision@10: what fraction of top-10 are present?
    const top10 = insights.slice(0, 10);
    const predictedInTop10 = top10.filter(b => presentBrands.has(b.entity_id)).length;
    const precisionAt10 = predictedInTop10 / 10;

    // AUC: How well do ranks separate present from absent?
    const auc = this.calculateAUC(insights, presentBrands);

    return {
      totalStores: presentBrands.size,
      predictedStores: presentBrands.size,
      accuracy: presentBrands.size > 0 ? predictedInTop10 / Math.min(10, presentBrands.size) : 0,
      precisionAt10,
      auc,
      examples: examples.slice(0, 7),
    };
  }

  private getDemoBacktest(location: Location): BacktestResult {
    const address = location.address.toLowerCase();
    
    let fixture;
    if (address.includes('wicker') || address.includes('milwaukee')) {
      fixture = wickerparkFixture;
    } else if (address.includes('boulder') || address.includes('pearl')) {
      fixture = boulderFixture;
    } else if (address.includes('sevierville') || address.includes('collier')) {
      fixture = seviervilleFixture;
    } else {
      fixture = wickerparkFixture;
    }
    
    return {
      totalStores: fixture.backtest.totalStores,
      predictedStores: fixture.backtest.totalStores,
      accuracy: fixture.backtest.precisionAt10,
      precisionAt10: fixture.backtest.precisionAt10,
      auc: fixture.backtest.auc,
      examples: [], // Would need to be added to fixtures
    };
  }

  /**
   * AUC calculation: For each (present, absent) pair, does present rank higher?
   * This is the exact methodology from round2/neigh_test.py
   */
  private calculateAUC(
    insights: Array<{ entity_id: string }>,
    presentBrands: Set<string>
  ): number {
    const positives = insights.filter(i => presentBrands.has(i.entity_id));
    const negatives = insights.filter(i => !presentBrands.has(i.entity_id));
    
    if (positives.length === 0 || negatives.length === 0) {
      return 0;
    }

    let sum = 0;
    for (const pos of positives) {
      const posRank = insights.indexOf(pos);
      for (const neg of negatives) {
        const negRank = insights.indexOf(neg);
        if (posRank < negRank) {
          sum += 1;
        } else if (posRank === negRank) {
          sum += 0.5;
        }
      }
    }
    
    return sum / (positives.length * negatives.length);
  }

  private async generateProspects(
    location: Location,
    insights: Array<{ entity_id: string; name: string; query?: { affinity?: number; affinity_rank?: number } }>,
    radius: number,
    _runId: string
  ): Promise<ProspectPack[]> {
    const prospectPacks: ProspectPack[] = [];

    // Only consider high-affinity brands (top 25% or affinity_rank >= 0.85)
    const candidates = insights.filter(i => (i.query?.affinity_rank || 0) >= 0.85);

    for (const candidate of candidates.slice(0, 20)) {
      // Check for actual stores nearby (real absence verification)
      const nearbyStores = findStoresNearby(candidate.entity_id, location.latitude, location.longitude, radius);
      
      // Absent means NO stores within radius
      if (nearbyStores.length > 0) {
        continue; // Brand is present, skip
      }

      const nationalCount = getNationalStoreCount(candidate.entity_id);
      
      // Only include brands that have at least some national presence
      if (nationalCount < 5) {
        continue;
      }

      // Two-source absence verification
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
          affinityRank: candidate.query?.affinity_rank || 0,
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

      // Limit to top 10 prospects
      if (prospectPacks.length >= 10) {
        break;
      }
    }

    return prospectPacks;
  }

  /**
   * Two-source absence verification using ATP dataset + OSM Overpass
   * 
   * Returns verification status based on both sources:
   * - 'verified (2 sources)': Both ATP and OSM show absence
   * - 'conflict': ATP shows absence but OSM shows presence
   * - 'unverified (1 source)': Only ATP available (OSM down/timeout)
   * - 'unverified': Neither source can verify
   */
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
    
    // Query OSM Overpass for branded retail within radius
    const osmResult = await this.overpass.queryBrands(lat, lng, radiusKm);
    
    // Graceful fallback when Overpass is down/timeout
    if (osmResult.error) {
      console.warn(`Overpass fallback (${osmResult.error}): single-source verification`);
      return {
        status: 'unverified (1 source)',
        sources,
      };
    }

    // Check if OSM found any matching brands
    const osmHasBrand = osmResult.brands.some(b => 
      b.brand?.toLowerCase().includes(brandName.toLowerCase()) ||
      b.name.toLowerCase().includes(brandName.toLowerCase())
    );

    if (osmHasBrand) {
      // Conflict: ATP says absent, OSM says present
      sources.push('OpenStreetMap (conflict)');
      return {
        status: 'conflict',
        sources,
      };
    }

    // Both sources confirm absence
    sources.push('OpenStreetMap');
    return {
      status: 'verified (2 sources)',
      sources,
    };
  }

  private generateReasons(
    prospect: { name: string; query?: { affinity_rank?: number } },
    location: Location,
    nationalCount: number,
    radius: number
  ): string[] {
    const reasons: string[] = [];
    
    const affinityRank = prospect.query?.affinity_rank || 0;
    if (affinityRank >= 0.95) {
      reasons.push(`Top 5% brand affinity in ${location.neighborhood || location.city || 'this area'}`);
    } else if (affinityRank >= 0.90) {
      reasons.push(`Top 10% brand affinity in ${location.neighborhood || location.city || 'this area'}`);
    } else if (affinityRank >= 0.85) {
      reasons.push(`Top 15% brand affinity in ${location.neighborhood || location.city || 'this area'}`);
    }

    reasons.push(`No existing location within ${radius}km radius (verified via All The Places store data)`);
    
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

  /**
   * Generate outreach draft lazily (not called during initial analysis)
   * Call this separately when user clicks "View Outreach"
   */
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
