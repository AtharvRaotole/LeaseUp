import { QlooClient } from '../providers/qloo';
import { OpenAIClient } from '../providers/openai';
import { OverpassClient } from './overpass';
import { GeocodeService } from './geocode';
import type { Env } from '../index';
import type {
  AnalysisRequest,
  AnalysisResponse,
  Location,
  BacktestResult,
  ProspectPack,
} from '@leaseup/contracts';
import { affinityThresholdAtPercentile, isProspectCandidate } from '../lib/prospect-filter';
import { formatFitsStorefront, getStorefrontFormatSpec } from '../lib/storefront-format';
import {
  wickerparkFixture,
  boulderFixture,
  seviervilleFixture,
  orderInsightsByLogisticBlend,
  buildTierFitByEntityId,
  chainSizeTierFromStoreCount,
  isProspectChainTier,
  getNationalStoreCount,
  DEMO_OSM_UNRECORDED_NOTE,
  matchDemoFixtureId,
  matchDemoChipWithinMeters,
  demoFixtureDensity,
  demoFixtureStratum,
  densityToDefaultStratum,
} from '@leaseup/fixtures';
import { createStoreCatalog, type StoreCatalog } from './store-catalog';
import { displayBrandName } from '../lib/brand-display';
import { brandCategoryLabel } from '../lib/brand-category';

/** Live Qloo recording instant (Oct 22, 2026 ~11:36 PM US Eastern). */
const DEMO_DATA_RECORDED_AT = '2026-10-23T03:36:00.000Z';
import { toOverpassSearchBrand } from '../lib/osm-brand-hints';
import { OSM_WIKIDATA_BY_ENTITY } from '../data/osm-wikidata-map';
import type { QlooLocation } from '../providers/qloo';
import { DemoModeRequiredError } from '../lib/demo-mode';
import {
  buildBaselineBacktest,
  buildBrandRankings,
  buildDualBacktest,
  buildMapStores,
  enrichProspectsWithNearest,
  extractQlooSignals,
} from '../lib/analysis-enrichment';
import { buildStrictEvalSnapshot } from '../lib/strict-eval-snapshot';
import { runStep, type StepEmitter } from '../lib/analysis-steps';
import { encodeGeohash } from '../lib/geohash';
import { sha256Short } from '../lib/cache-key';
import {
  OsmSnapshotCatalog,
  osmSnapshotBrandStatus,
  osmSnapshotDisplayLabel,
  osmSnapshotRecordedAt,
} from './osm-snapshot-catalog';
import { loadTradeAreaTasteForProspect } from '../lib/trade-area-taste';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

export class AnalysisService {
  private qloo: QlooClient;
  private openai: OpenAIClient;
  private overpass: OverpassClient;
  private geocode: GeocodeService;
  private db: D1Database;
  private cache: KVNamespace;
  private mode: 'live' | 'demo';
  private catalog: StoreCatalog;
  private osmSnapshot: OsmSnapshotCatalog | null;
  private verifyInflight = new Map<string, Promise<unknown>>();

  constructor(env: Env) {
    this.mode = env.APP_MODE === 'live' ? 'live' : 'demo';
    this.qloo = new QlooClient(env);
    this.openai = new OpenAIClient(env);
    this.overpass = new OverpassClient(env.CACHE, 12000, this.mode === 'demo');
    this.cache = env.CACHE;
    this.geocode = new GeocodeService(
      env.CACHE,
      env.NOMINATIM_CONTACT || DEFAULT_NOMINATIM_CONTACT,
      this.mode
    );
    this.db = env.DB;
    this.catalog = createStoreCatalog(env, this.mode);
    this.osmSnapshot = env.ASSETS ? new OsmSnapshotCatalog(env.ASSETS, env.CACHE) : null;
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
        const resolved = await this.polishDemoChipLocation(
          await this.geocode.resolveForAnalysis(request.address, request.confirmedLocation)
        );
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

      const demoFixtureIdForDensity = matchDemoFixtureId(location.address);
      const siteDensity = demoFixtureIdForDensity
        ? demoFixtureDensity(demoFixtureIdForDensity)
        : 'urban';
      const siteStratum = demoFixtureIdForDensity
        ? demoFixtureStratum(demoFixtureIdForDensity)
        : densityToDefaultStratum(siteDensity);

      const { blended: backtestBlended, baseline: backtestBaseline } = await runStep(
        emit,
        'backtest',
        'Prove it (backtest)',
        async () => {
          const dual = await buildDualBacktest(
            location,
            insights,
            request.radius,
            this.catalog,
            siteStratum
          );
          const baseline = await buildBaselineBacktest(
            location,
            insights,
            request.radius,
            this.catalog,
            siteStratum
          );
          return {
            summary: `Raw P@10 ${(dual.raw.precisionAt10 * 100).toFixed(0)}% · Blended P@10 ${(dual.blended.precisionAt10 * 100).toFixed(0)}%`,
            detail: {
              rawPrecisionAt10: dual.raw.precisionAt10,
              blendedPrecisionAt10: dual.blended.precisionAt10,
              baselinePrecisionAt10: baseline.precisionAt10,
              rawAuc: dual.raw.auc,
              blendedAuc: dual.blended.auc,
            },
            result: { ...dual, baseline },
          };
        }
      );

      let formatFilteredCount = 0;
      const prospects = await runStep(
        emit,
        'prospects',
        "Find who's missing",
        async () => {
          const generated = await this.generateProspects(
            location,
            insights,
            request.radius,
            runId,
            request.storefrontSqFt
          );
          formatFilteredCount = generated.formatFilteredCount;
          const packs = generated.packs;
          return {
            summary: `${packs.length} high-affinity brands absent in radius`,
            detail: { count: packs.length, formatFilteredCount },
            result: packs,
          };
        }
      );

      await runStep(emit, 'verify', 'Double-check absence (ATP + OSM)', async () => {
        const pending = prospects.filter((p) => p.brand.verified === 'verifying...').length;
        const verified = prospects.filter((p) => p.brand.verified === 'verified (2 sources)').length;
        const singleSource = prospects.filter(
          (p) => p.brand.verified === 'unverified (1 source)'
        ).length;
        const demoOsmSkipped = prospects.some((p) =>
          p.coverageNote?.includes(DEMO_OSM_UNRECORDED_NOTE)
        );
        let summary: string;
        if (pending > 0) {
          summary = `${pending} prospects queued for OpenStreetMap verification (non-blocking)`;
        } else if (demoOsmSkipped) {
          summary = `Demo: ATP only (${DEMO_OSM_UNRECORDED_NOTE})`;
        } else if (verified > 0) {
          summary = `${verified} prospects verified by ATP + OpenStreetMap`;
        } else if (singleSource > 0) {
          summary = `${singleSource} prospects ATP-only (OSM unavailable or single-source)`;
        } else {
          summary = 'No prospects required OSM verification';
        }
        return {
          summary,
          detail: { verified, pending, singleSource },
          result: true,
        };
      });

      await runStep(emit, 'outreach_ready', 'Draft outreach (on demand)', async () => ({
        summary: 'Outreach drafts generate on click (never auto-sent)',
        result: true,
      }));

      const rankings = await buildBrandRankings(
        location,
        insights,
        request.radius,
        this.catalog,
        siteStratum
      );
      const demoFixtureId = matchDemoFixtureId(location.address);
      const strictEval = await buildStrictEvalSnapshot(
        location,
        insights,
        request.radius,
        demoFixtureId ? demoFixtureStratum(demoFixtureId) : densityToDefaultStratum(siteDensity),
        this.catalog
      );
      const mapStores = await buildMapStores(location, insights, request.radius, this.catalog);
      const nearestEnriched = await enrichProspectsWithNearest(prospects, location, this.catalog);
      const enrichedProspects = await Promise.all(
        nearestEnriched.map(async (pack) => {
          const insight = insights.find((i) => i.entity_id === pack.brand.entityId);
          const signals = insight ? extractQlooSignals(insight) : [];
          const tradeAreaTaste = await loadTradeAreaTasteForProspect(
            this.qloo,
            location,
            pack.brand.entityId,
            request.radius,
            runId
          );
          return {
            ...pack,
            qlooSignals: signals.length > 0 ? signals : undefined,
            tradeAreaTaste,
          };
        })
      );

      const dataQuality = this.assessDataQuality(insights.length, backtestBlended);
      const warnings = this.generateWarnings(insights.length, backtestBlended, location);
      if (formatFilteredCount > 0) {
        warnings.push(
          `${formatFilteredCount} big-box or format brands hidden for ${request.storefrontSqFt ?? 2500} sq ft storefront`
        );
      }

      const response: AnalysisResponse = {
        location,
        backtest: backtestBlended,
        backtestBlended,
        backtestBaseline,
        rankings,
        mapStores,
        heatmapAvailable: this.mode === 'live',
        prospects: enrichedProspects,
        dataQuality,
        warnings,
        runId,
        timestamp: this.mode === 'demo' ? DEMO_DATA_RECORDED_AT : new Date().toISOString(),
        mode: this.mode,
        osmSnapshotRecordedAt: this.osmSnapshot ? osmSnapshotRecordedAt() : undefined,
        osmSnapshotLabel: this.osmSnapshot ? osmSnapshotDisplayLabel() : undefined,
        storefrontSqFt: request.storefrontSqFt ?? 2_500,
        formatFilteredCount: formatFilteredCount || undefined,
        strictEval,
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

  private async polishDemoChipLocation(location: Location): Promise<Location> {
    const chip = matchDemoChipWithinMeters(location.latitude, location.longitude);
    if (!chip) return location;
    return {
      ...location,
      neighborhood: chip.neighborhood,
      city: chip.city,
    };
  }

  private async generateProspects(
    location: Location,
    insights: Array<{ entity_id: string; name: string; query?: { affinity?: number; affinity_rank?: number } }>,
    radius: number,
    _runId: string,
    storefrontSqFt?: number
  ): Promise<{ packs: ProspectPack[]; formatFilteredCount: number }> {
    const sqFt = storefrontSqFt ?? 2_500;
    let formatFilteredCount = 0;
    const prospectPacks: ProspectPack[] = [];
    const fixtureId = matchDemoFixtureId(location.address);
    const siteDensity = fixtureId ? demoFixtureDensity(fixtureId) : 'urban';
    const blended = orderInsightsByLogisticBlend(insights, siteDensity);
    const tierFit = buildTierFitByEntityId(insights.map((i) => i.entity_id));
    const rankedCount = insights.length;
    const affinities = insights.map((i) => i.query?.affinity ?? 0).filter((a) => a > 0);
    const affinityThreshold = affinityThresholdAtPercentile(affinities, 0.75);

    const candidates = blended.filter((candidate) => {
      const tier = chainSizeTierFromStoreCount(getNationalStoreCount(candidate.entity_id));
      if (!isProspectChainTier(tier)) return false;
      return isProspectCandidate(candidate, insights.length, affinityThreshold);
    });

    type Eligible = {
      candidate: (typeof candidates)[number];
      nationalCount: number;
    };
    const eligible: Eligible[] = [];

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

      if (!formatFitsStorefront(candidate.entity_id, sqFt)) {
        formatFilteredCount += 1;
        continue;
      }

      eligible.push({ candidate, nationalCount });
      if (eligible.length >= 10) {
        break;
      }
    }

    for (const { candidate, nationalCount } of eligible) {
      const displayName = displayBrandName(candidate.entity_id, candidate.name);
      const verification = await this.verifyFromOsmSnapshot(
        candidate.entity_id,
        location,
        radius
      );

      if (verification.status === 'conflict - likely present') {
        continue;
      }

      const reasons = this.generateReasons(
        candidate,
        location,
        nationalCount,
        rankedCount
      );

      let coverageNote = this.catalog.getCoverageNote(candidate.entity_id, nationalCount);
      if (osmSnapshotBrandStatus(candidate.entity_id) === 'failed') {
        coverageNote = this.appendCoverageNote(
          'OpenStreetMap snapshot fetch failed for this brand; showing ATP only.',
          coverageNote
        );
      } else if (osmSnapshotBrandStatus(candidate.entity_id) === 'missing') {
        coverageNote = this.appendCoverageNote(
          'No Wikidata QID for this brand in our OSM snapshot; showing ATP only.',
          coverageNote
        );
      }

      const formatSpec = getStorefrontFormatSpec(candidate.entity_id);
      const tierContext = tierFit.get(candidate.entity_id);

      prospectPacks.push({
        coverageNote,
        brand: {
          entityId: candidate.entity_id,
          name: displayName,
          affinity: candidate.query?.affinity || 0,
          affinityRank: candidate.blendedRank,
          popularity: undefined,
          verified: verification.status,
          verificationSources: verification.sources,
          nationalStoreCount: nationalCount,
          chainSizeTier: tierContext?.tier,
          tasteFitBeyondChainPercentile: tierContext?.tasteFitBeyondChainPercentile,
          nearbyStoreCount: 0,
          storefrontFormat: formatSpec.format,
          minStorefrontSqFt: formatSpec.minSqFt,
        },
        tenantMixScore: (() => {
          const categoryFit = brandCategoryLabel(candidate.entity_id);
          if (!categoryFit) return undefined;
          return {
            score: 0,
            coAffinityMean: 0,
            categoryFit,
            explanation: '',
          };
        })(),
        demographics: undefined,
        outreachDraft: '',
        reasons,
      });
    }

    return { packs: prospectPacks, formatFilteredCount };
  }

  private async verifyFromOsmSnapshot(
    entityId: string,
    location: Location,
    radiusKm: number
  ): Promise<{
    status:
      | 'verified (2 sources)'
      | 'unverified (1 source)'
      | 'conflict - likely present';
    sources: string[];
  }> {
    const sources: string[] = ['All The Places (CC0)'];
    const snapshotLabel = osmSnapshotDisplayLabel();
    const status = osmSnapshotBrandStatus(entityId);
    if (status === 'failed' || status === 'missing' || !this.osmSnapshot) {
      return { status: 'unverified (1 source)', sources };
    }
    const found = await this.osmSnapshot.hasBrandNearby(
      entityId,
      location.latitude,
      location.longitude,
      radiusKm
    );
    if (found) {
      return {
        status: 'conflict - likely present',
        sources: [...sources, `${snapshotLabel} (store found)`],
      };
    }
    return {
      status: 'verified (2 sources)',
      sources: [...sources, snapshotLabel],
    };
  }

  async warmOsmVerification(
    location: Location,
    radiusKm: number,
    prospects: ProspectPack[]
  ): Promise<void> {
    await this.applyOsmVerification(location, radiusKm, prospects);
    void this.refreshLiveOverpassOptional(location, radiusKm, prospects);
  }

  /** Live Overpass refresh only; never downgrades snapshot-based verification. */
  private async refreshLiveOverpassOptional(
    location: Location,
    radiusKm: number,
    prospects: ProspectPack[]
  ): Promise<void> {
    if (this.mode !== 'live') return;
    const pending = prospects.filter((p) => p.brand.verified === 'unverified (1 source)');
    if (pending.length === 0) return;
    const lockKey = `verify:live-overpass:${await sha256Short(
      `${location.latitude},${location.longitude}:${radiusKm}:${pending.map((p) => p.brand.entityId).sort().join(',')}`
    )}`;
    const existing = await this.cache.get(lockKey);
    if (existing) return;
    await this.cache.put(lockKey, '1', { expirationTtl: 60 });
    const searchBrands = pending.map((pack) =>
      toOverpassSearchBrand(pack.brand.entityId, pack.brand.name)
    );
    const osmResult = await this.overpass.queryProspectBrands(
      location.latitude,
      location.longitude,
      radiusKm,
      searchBrands,
      location.address
    );
    if (!osmResult.error) {
      for (const pack of pending.slice(0, 5)) {
        const hint = this.verifyAbsence(osmResult, pack.brand.name, pack.brand.entityId);
        if (hint.status === 'conflict - likely present') {
          console.log(
            JSON.stringify({
              event: 'overpass_live_conflict_hint',
              brand: pack.brand.name,
              entityId: pack.brand.entityId,
            })
          );
        }
      }
    }
  }

  private async verifyResultCacheKey(
    location: Location,
    radiusKm: number,
    prospects: ProspectPack[]
  ): Promise<string | null> {
    const pendingIds = prospects.map((p) => p.brand.entityId).sort();
    if (pendingIds.length === 0) return null;
    const gh5 = encodeGeohash(location.latitude, location.longitude, 5);
    const idHash = await sha256Short(pendingIds.join(','));
    return `verify:result:v1:${gh5}:${radiusKm}:${idHash}`;
  }

  async applyOsmVerification(
    location: Location,
    radiusKm: number,
    prospects: ProspectPack[]
  ): Promise<{
    prospects: ProspectPack[];
    summary: {
      verifiedTwoSource: number;
      singleSource: number;
      conflicts: number;
      unavailable: boolean;
    };
  }> {
    const verifyCacheKey = await this.verifyResultCacheKey(location, radiusKm, prospects);
    if (verifyCacheKey) {
      const cached = await this.cache.get(verifyCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          prospects: ProspectPack[];
          summary: {
            verifiedTwoSource: number;
            singleSource: number;
            conflicts: number;
            unavailable: boolean;
          };
        };
        if (!parsed.summary.unavailable) return parsed;
      }
      const inflight = this.verifyInflight.get(verifyCacheKey);
      if (inflight) {
        return (await inflight) as {
          prospects: ProspectPack[];
          summary: {
            verifiedTwoSource: number;
            singleSource: number;
            conflicts: number;
            unavailable: boolean;
          };
        };
      }
    }

    const compute = async () => {
      let verifiedTwoSource = 0;
      let singleSource = 0;
      let conflicts = 0;

      const mapped = await Promise.all(
        prospects.map(async (pack) => {
          const verification = await this.verifyFromOsmSnapshot(
            pack.brand.entityId,
            location,
            radiusKm
          );
          if (verification.status === 'verified (2 sources)') verifiedTwoSource += 1;
          if (verification.status === 'unverified (1 source)') singleSource += 1;
          if (verification.status === 'conflict - likely present') conflicts += 1;
          return {
            ...pack,
            brand: {
              ...pack.brand,
              verified: verification.status,
              verificationSources: verification.sources,
            },
          };
        })
      );

      const updated = mapped.filter((pack) => pack.brand.verified !== 'conflict - likely present');

      const payload = {
        prospects: updated,
        summary: {
          verifiedTwoSource,
          singleSource,
          conflicts,
          unavailable: false,
        },
      };

      if (verifyCacheKey) {
        await this.cache.put(verifyCacheKey, JSON.stringify(payload), { expirationTtl: 3600 });
      }

      return payload;
    };

    const promise = compute();
    if (verifyCacheKey) {
      this.verifyInflight.set(verifyCacheKey, promise);
      promise.finally(() => this.verifyInflight.delete(verifyCacheKey));
    }

    return promise;
  }

  private verifyAbsence(
    osmResult: {
      brands: Array<{ name: string; brand?: string; brandWikidata?: string }>;
      error?: string;
    },
    brandName: string,
    entityId?: string,
    qlooName?: string
  ): {
    status:
      | 'verified (2 sources)'
      | 'conflict'
      | 'unverified (1 source)'
      | 'unverified'
      | 'verifying...'
      | 'conflict - likely present';
    sources: string[];
  } {
    const sources: string[] = ['All The Places (CC0)'];

    if (osmResult.error === 'demo_osm_unrecorded') {
      return {
        status: 'unverified (1 source)',
        sources,
      };
    }

    if (osmResult.error) {
      console.warn(`Overpass fallback (${osmResult.error}): single-source verification`);
      return {
        status: 'unverified (1 source)',
        sources,
      };
    }

    const needles = [brandName, qlooName].filter(Boolean).map((s) => s!.toLowerCase());
    const wikidata = entityId ? OSM_WIKIDATA_BY_ENTITY[entityId] : undefined;

    const osmHasBrand = osmResult.brands.some((b) => {
      if (wikidata && b.brandWikidata === wikidata) return true;
      const brandLower = b.brand?.toLowerCase() ?? '';
      const nameLower = b.name.toLowerCase();
      return needles.some(
        (n) =>
          n.length > 0 &&
          (brandLower.includes(n) ||
            n.includes(brandLower) ||
            nameLower.includes(n) ||
            n.includes(nameLower))
      );
    });

    if (osmHasBrand) {
      return {
        status: 'conflict - likely present',
        sources: [...sources, 'OpenStreetMap (store found)'],
      };
    }

    sources.push('OpenStreetMap');
    return {
      status: 'verified (2 sources)',
      sources,
    };
  }

  private appendCoverageNote(extra: string, existing?: string): string {
    if (!existing) return extra;
    if (existing.includes(extra)) return existing;
    return `${existing} ${extra}`;
  }

  private generateReasons(
    prospect: { name: string; qlooRank: number; query?: { affinity?: number } },
    location: Location,
    nationalCount: number,
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

    reasons.push(
      'Prospect ordering uses the fitted taste-aware blend (Qloo rank, chain size, and trade-area density); backtest uses the same blend with adaptive-radius presence'
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

    if (!location.neighborhood) {
      warnings.push('Location resolution is approximate');
    }

    warnings.push(
      `Absence uses ATP geotiles + OpenStreetMap when available (${this.catalog.getBrandIds().length} chains). Single-source absence is never shown as confirmed.`
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
      timestamp: this.mode === 'demo' ? DEMO_DATA_RECORDED_AT : new Date().toISOString(),
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
      coTenantBrands?: string[];
      verificationLabel?: string;
    }
  ): Promise<{ draft: string; model: string }> {
    const result = await this.openai.generateOutreach({
      brandName,
      address,
      reasons,
      runId,
      affinityRank: context?.affinityRank,
      neighborhood: context?.neighborhood,
      nearestStoreKm: context?.nearestStoreKm,
      coTenantBrands: context?.coTenantBrands,
      verificationLabel: context?.verificationLabel,
    });

    return {
      draft: `${result.subject}\n\n${result.body}`,
      model: result.model,
    };
  }
}
