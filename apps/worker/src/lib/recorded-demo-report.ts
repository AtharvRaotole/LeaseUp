import type { AnalysisRequest, AnalysisResponse, AnalysisStep } from '@leaseup/contracts';
import { DEMO_CHIP_ADDRESSES, matchDemoFixtureId, type DemoFixtureId } from '@leaseup/fixtures/worker';
import type { Env } from '../index';
import { AnalysisService } from '../services/analysis';

/** Radius the three demo chip recordings were captured at. */
export const RECORDED_DEMO_RADIUS_KM = 10;
export const RECORDED_DEMO_DEFAULT_SQFT = 2_500;

const RECORDED_STEP_IDS = new Set<AnalysisStep['id']>([
  'locate',
  'taste',
  'backtest',
  'prospects',
  'verify',
  'outreach_ready',
]);

/**
 * A demo chip report is served from the committed recordings (fixtures plus recorded
 * public assets) when it asks for the chip address at the recorded radius with no
 * category filter. Those replays never call Qloo, never touch the live judge quota and
 * never write D1 or KV, so they load even after the daily live cap is used up.
 */
export function recordedDemoChipId(request: AnalysisRequest): DemoFixtureId | null {
  if (request.categoryTags && request.categoryTags.length > 0) return null;
  if (request.radius !== RECORDED_DEMO_RADIUS_KM) return null;
  return matchDemoFixtureId(request.address);
}

export function isDemoChipId(value: string): value is DemoFixtureId {
  return Object.prototype.hasOwnProperty.call(DEMO_CHIP_ADDRESSES, value);
}

/**
 * The chip address, or a legacy spelling of it, as the visitor asked. Keeping their spelling
 * means watchlist and pipeline links match the address shown on the report.
 */
export function recordedDemoAddress(chip: DemoFixtureId, address?: string): string {
  const asked = address?.trim();
  if (asked && matchDemoFixtureId(asked) === chip) return asked;
  return DEMO_CHIP_ADDRESSES[chip];
}

export function recordedDemoRequest(
  chip: DemoFixtureId,
  storefrontSqFt?: number,
  address?: string
): AnalysisRequest {
  return {
    address: recordedDemoAddress(chip, address),
    radius: RECORDED_DEMO_RADIUS_KM,
    storefrontSqFt: storefrontSqFt ?? RECORDED_DEMO_DEFAULT_SQFT,
  };
}

/** Env view that forces the offline recorded pipeline (no Qloo, OpenAI, Overpass or geocoder calls). */
export function recordedDemoEnv(env: Env): Env {
  return { ...env, APP_MODE: 'demo' };
}

/** Recorded steps keep label and summary but drop replay timings, which are not the recorded run. */
function recordedStep(step: AnalysisStep): AnalysisStep {
  return {
    id: step.id,
    label: step.label,
    status: step.status,
    summary: step.summary,
  };
}

const memo = new Map<string, Promise<AnalysisResponse>>();
const MEMO_LIMIT = 24;

function memoKey(chip: DemoFixtureId, sqft: number, address: string) {
  return `${chip}:${sqft}:${address}`;
}

async function buildRecordedDemoReport(
  env: Env,
  chip: DemoFixtureId,
  sqft: number,
  address: string
): Promise<AnalysisResponse> {
  const service = new AnalysisService(recordedDemoEnv(env), { readOnly: true });
  const steps = new Map<AnalysisStep['id'], AnalysisStep>();
  const response = await service.analyzeWithSteps(
    recordedDemoRequest(chip, sqft, address),
    `recorded-${chip}`,
    'recorded',
    (step) => {
      if (RECORDED_STEP_IDS.has(step.id)) steps.set(step.id, recordedStep(step));
    }
  );
  return {
    ...response,
    mode: 'demo',
    agentSteps: [...steps.values()].filter((s) => s.status === 'complete'),
  };
}

/**
 * Recorded demo chip report, memoized per isolate. Read-only: no D1, KV or Qloo traffic.
 */
export function recordedDemoReport(
  env: Env,
  chip: DemoFixtureId,
  storefrontSqFt?: number,
  address?: string
): Promise<AnalysisResponse> {
  const sqft = storefrontSqFt ?? RECORDED_DEMO_DEFAULT_SQFT;
  const asked = recordedDemoAddress(chip, address);
  const key = memoKey(chip, sqft, asked);
  const existing = memo.get(key);
  if (existing) return existing;
  if (memo.size >= MEMO_LIMIT) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  const pending = buildRecordedDemoReport(env, chip, sqft, asked).catch((err) => {
    memo.delete(key);
    throw err;
  });
  memo.set(key, pending);
  return pending;
}

/** Test hook. */
export function clearRecordedDemoReportMemo() {
  memo.clear();
}
