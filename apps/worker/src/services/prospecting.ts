import { randomUUID } from 'node:crypto';
import type {
  AnalysisRequest,
  AnalysisStepId,
  Location,
  ProspectingConfirmGeocode,
  ProspectingCreate,
  ProspectingJob,
  ProspectingStep,
  ProspectingStepId,
} from '@leaseup/contracts';
import { ProspectingJobSchema } from '@leaseup/contracts';
import type { Env } from '../index';
import { AnalysisService } from './analysis';
import { NominatimClient } from './nominatim';
import { PitchService } from './pitch';
import {
  boulderFixture,
  matchDemoFixtureId,
  seviervilleFixture,
  wickerparkFixture,
} from '@leaseup/fixtures/worker';
import { rankGeocodeCandidates } from '../lib/geocode-rank';
import { displayBrandName } from '../lib/brand-display';
import { getResponseCache } from '../lib/worker-cache';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

const STALE_RUNNING_MS = 120_000;

const STEP_DEFS: Array<{ id: ProspectingStepId; label: string }> = [
  { id: 'geocode', label: 'Geocode and confirm' },
  { id: 'taste', label: 'Read neighborhood taste' },
  { id: 'scan_stores', label: 'Scan existing stores' },
  { id: 'verify_osm', label: 'Verify against OpenStreetMap' },
  { id: 'rank_backtest', label: 'Rank and backtest' },
  { id: 'explain_top5', label: 'Explain top 5 prospects' },
  { id: 'draft_outreach', label: 'Draft outreach emails' },
  { id: 'pitch_pack', label: 'Assemble pitch pack' },
];

function initialSteps(): ProspectingStep[] {
  return STEP_DEFS.map((s) => ({ ...s, status: 'pending' }));
}

const ANALYSIS_TO_PROSPECTING: Partial<Record<AnalysisStepId, ProspectingStepId>> = {
  locate: 'geocode',
  taste: 'taste',
  backtest: 'rank_backtest',
  prospects: 'scan_stores',
  verify: 'verify_osm',
};

export class ProspectingService {
  private db: D1Database;
  private nominatim: NominatimClient;
  private env: Env;
  private mode: 'live' | 'demo';

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
    this.mode = env.APP_MODE === 'live' ? 'live' : 'demo';
    this.nominatim = new NominatimClient(
      getResponseCache(),
      env.NOMINATIM_CONTACT || DEFAULT_NOMINATIM_CONTACT
    );
  }

  async create(input: ProspectingCreate): Promise<ProspectingJob> {
    const job: ProspectingJob = {
      id: randomUUID(),
      status: 'pending',
      input,
      steps: initialSteps(),
      createdAt: new Date().toISOString(),
      mode: this.mode,
    };
    await this.save(job);
    return this.geocodeJob(job.id);
  }

  async get(id: string): Promise<ProspectingJob | null> {
    const row = await this.db
      .prepare('SELECT payload FROM prospecting_jobs WHERE job_id = ?')
      .bind(id)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    return ProspectingJobSchema.parse(JSON.parse(row.payload));
  }

  async resumeStaleRunning(id: string): Promise<ProspectingJob | null> {
    const job = await this.get(id);
    if (!job) return null;
    if (job.status !== 'running' || !job.runningStartedAt) return job;
    const started = Date.parse(job.runningStartedAt);
    if (Number.isFinite(started) && Date.now() - started > STALE_RUNNING_MS) {
      job.status = job.confirmedLocation ? 'ready' : 'pending';
      job.runningStartedAt = undefined;
      await this.save(job);
    }
    return job;
  }

  async confirmGeocode(id: string, body: ProspectingConfirmGeocode): Promise<ProspectingJob> {
    const job = await this.get(id);
    if (!job) throw new Error('Job not found');
    if (!job.geocodeCandidates?.length) throw new Error('No geocode candidates');
    const candidate = job.geocodeCandidates[body.candidateIndex];
    if (!candidate) throw new Error('Invalid candidate index');

    const neighborhood =
      candidate.neighborhood ??
      (await this.nominatim.reverseGeocode(candidate.latitude, candidate.longitude));

    job.confirmedLocation = {
      address: job.input.address,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      resolvedAddress: candidate.resolvedAddress,
      neighborhood,
      city: candidate.city,
    };
    job.geocodeCandidates = undefined;
    job.status = 'ready';
    await this.save(job);
    return job;
  }

  async geocodeJob(id: string): Promise<ProspectingJob> {
    const job = await this.get(id);
    if (!job) throw new Error('Job not found');
    if (job.confirmedLocation) {
      job.status = 'ready';
      await this.save(job);
      return job;
    }

    if (this.mode === 'demo' && matchDemoFixtureId(job.input.address)) {
      const loc = resolveDemoLocation(job.input.address);
      job.confirmedLocation = loc;
      job.status = 'ready';
      await this.patchStep(job, 'geocode', {
        status: 'complete',
        summary: `Resolved ${loc.neighborhood ?? loc.address}`,
        detail: { location: loc },
      });
      await this.save(job);
      return job;
    }

    const candidates = rankGeocodeCandidates(
      job.input.address,
      await this.nominatim.geocodeCandidates(job.input.address, 5)
    );
    if (candidates.length === 0) {
      job.status = 'error';
      job.error = 'No match found for this address.';
      await this.save(job);
      return job;
    }
    if (candidates.length === 1) {
      const c0 = candidates[0]!;
      const neighborhood =
        c0.neighborhood ??
        (await this.nominatim.reverseGeocode(c0.latitude, c0.longitude));
      job.confirmedLocation = {
        address: job.input.address,
        latitude: c0.latitude,
        longitude: c0.longitude,
        resolvedAddress: c0.resolvedAddress,
        neighborhood,
        city: c0.city,
      };
      job.status = 'ready';
      await this.patchStep(job, 'geocode', {
        status: 'complete',
        summary: `Resolved ${neighborhood ?? c0.resolvedAddress}`,
        detail: { candidate: c0 },
      });
    } else {
      job.geocodeCandidates = candidates;
      job.status = 'needs_geocode';
      await this.patchStep(job, 'geocode', {
        status: 'running',
        summary: `${candidates.length} matches need confirmation`,
        detail: { candidates },
      });
    }
    await this.save(job);
    return job;
  }

  async run(
    id: string,
    ipHash: string,
    onStep?: (job: ProspectingJob) => Promise<void>
  ): Promise<ProspectingJob> {
    await this.resumeStaleRunning(id);
    let job = await this.get(id);
    if (!job) throw new Error('Job not found');

    if (job.status === 'needs_geocode') {
      return job;
    }

    if (!job.confirmedLocation) {
      job = await this.geocodeJob(id);
      if (job.status === 'needs_geocode' || job.status === 'error') return job;
    }

    if (job.status === 'complete') return job;

    job.status = 'running';
    job.runningStartedAt = new Date().toISOString();
    await this.save(job);
    await onStep?.(job);

    const analysisService = new AnalysisService(this.env);
    const runId = randomUUID();
    const request: AnalysisRequest = {
      ...job.input,
      confirmedLocation: job.confirmedLocation,
    };

    try {
      const result = await analysisService.analyzeWithSteps(
        request,
        runId,
        ipHash,
        async (step) => {
          const prospectingId = ANALYSIS_TO_PROSPECTING[step.id];
          if (!prospectingId) return;
          await this.patchStep(job!, prospectingId, {
            label: step.label,
            status: step.status,
            durationMs: step.durationMs,
            summary: step.summary,
            detail: step.detail,
          });
          await this.save(job!);
          await onStep?.(job!);
        }
      );

      job.analysisRunId = runId;

      const absentCount =
        result.rankings?.filter((r) => !r.presentInRadius).length ?? result.prospects.length;
      await this.patchStep(job, 'scan_stores', {
        status: 'complete',
        summary: `Found ${absentCount} brands with no store in ${request.radius} km`,
        detail: { absentCount, prospectCount: result.prospects.length },
      });

      const { prospects: verified, summary: osmSummary } =
        await analysisService.applyOsmVerification(
          result.location,
          request.radius,
          result.prospects
        );
      result.prospects = verified;
      const verifyLine = osmSummary.unavailable
        ? 'OpenStreetMap unavailable; All The Places store data only'
        : `${osmSummary.verifiedTwoSource} verified (2 sources), ${osmSummary.singleSource} single source`;
      await this.patchStep(job, 'verify_osm', {
        status: 'complete',
        summary: verifyLine,
        detail: { osmSummary, prospects: verified.map((p) => p.brand) },
      });

      const top5 = result.prospects.slice(0, 5);
      await this.patchStep(job, 'explain_top5', {
        status: 'complete',
        summary: top5.map((p) => displayBrandName(p.brand.entityId, p.brand.name)).join(', '),
        detail: {
          prospects: top5.map((p) => ({
            name: p.brand.name,
            entityId: p.brand.entityId,
            rank: p.brand.affinityRank,
            reasons: p.reasons,
          })),
        },
      });

      const drafts = [];
      for (const pack of result.prospects.slice(0, 3)) {
        const name = displayBrandName(pack.brand.entityId, pack.brand.name);
        const { draft, model } = await analysisService.generateOutreachForBrand(
          name,
          result.location.address,
          pack.reasons,
          runId,
          {
            affinityRank: pack.brand.affinityRank,
            neighborhood: result.location.neighborhood,
            nearestStoreKm: pack.nearestExistingStoreKm,
          }
        );
        const [subjectLine, ...bodyLines] = draft.split('\n\n');
        const subject = subjectLine?.startsWith('Subject:')
          ? subjectLine.replace(/^Subject:\s*/, '')
          : `Space for ${name} near ${result.location.neighborhood ?? 'your site'}`;
        const body = bodyLines.join('\n\n') || draft;
        drafts.push({
          entityId: pack.brand.entityId,
          brandName: name,
          subject,
          body,
          model,
        });
      }
      job.outreachDrafts = drafts;
      await this.patchStep(job, 'draft_outreach', {
        status: 'complete',
        summary: `Drafted ${drafts.length} outreach emails (not sent)`,
        detail: { drafts: drafts.map((d) => ({ brandName: d.brandName, subject: d.subject })) },
      });

      const pitch = await new PitchService(this.env).create({
        results: result,
        radiusKm: request.radius,
      });
      job.pitchId = pitch.id;
      await this.patchStep(job, 'pitch_pack', {
        status: 'complete',
        summary: `Pitch pack ready`,
        detail: { pitchId: pitch.id },
      });

      job.status = 'complete';
      job.runningStartedAt = undefined;
      await this.save(job);
      await onStep?.(job);
      return job;
    } catch (err) {
      job.status = 'error';
      job.error = (err as Error).message;
      job.runningStartedAt = undefined;
      await this.save(job);
      await onStep?.(job);
      throw err;
    }
  }

  private async patchStep(
    job: ProspectingJob,
    id: ProspectingStepId,
    patch: Partial<ProspectingStep>
  ): Promise<void> {
    job.steps = job.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  }

  private async save(job: ProspectingJob): Promise<void> {
    ProspectingJobSchema.parse(job);
    await this.db
      .prepare('INSERT INTO prospecting_jobs (job_id, payload) VALUES (?, ?) ON CONFLICT(job_id) DO UPDATE SET payload = excluded.payload')
      .bind(job.id, JSON.stringify(job))
      .run();
  }
}

function resolveDemoLocation(address: string): Location {
  const fixtureId = matchDemoFixtureId(address);
  if (!fixtureId) {
    throw new Error('Demo mode only supports the three example addresses on the home page.');
  }
  const fixture =
    fixtureId === 'wicker'
      ? wickerparkFixture
      : fixtureId === 'boulder'
        ? boulderFixture
        : seviervilleFixture;
  const placeParts = fixture.location.name.split(',').map((p) => p.trim()).filter(Boolean);
  const neighborhood = placeParts[0] ?? fixture.location.name;
  const city = placeParts.length > 1 ? placeParts.slice(1).join(', ') : undefined;
  return {
    address,
    latitude: fixture.location.latitude,
    longitude: fixture.location.longitude,
    neighborhood,
    city,
    resolvedAddress: fixture.location.name,
  };
}
