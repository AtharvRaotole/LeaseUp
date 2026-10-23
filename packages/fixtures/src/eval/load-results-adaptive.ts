import resultsAdaptive from './results_adaptive.json';
import {
  normalizeAddress,
  matchDemoFixtureId,
  type DemoFixtureId,
} from '../demo-addresses.js';
import type { AdaptiveEvalAddressRow, ResultsAdaptive } from './results-adaptive-types.js';

const BUNDLE = resultsAdaptive as unknown as ResultsAdaptive;

const DEMO_ROW_ID: Record<DemoFixtureId, string> = {
  wicker: 'wicker-park',
  boulder: 'boulder',
  sevierville: 'sevierville',
};

export function loadResultsAdaptive(): ResultsAdaptive {
  return BUNDLE;
}

export function adaptiveEvalRowCount(): number {
  return loadResultsAdaptive().per_address.length;
}

export function findAdaptiveEvalRowByAddress(address: string): AdaptiveEvalAddressRow | undefined {
  const norm = normalizeAddress(address);
  const direct = loadResultsAdaptive().per_address.find(
    (row) => normalizeAddress(row.address) === norm
  );
  if (direct) return direct;

  const fixtureId = matchDemoFixtureId(address);
  if (!fixtureId) return undefined;
  const wantId = DEMO_ROW_ID[fixtureId];
  return loadResultsAdaptive().per_address.find(
    (row) => row.id === wantId || row.id?.startsWith(fixtureId)
  );
}

export function findAdaptiveEvalRowForDemo(fixtureId: DemoFixtureId): AdaptiveEvalAddressRow | undefined {
  const wantId = DEMO_ROW_ID[fixtureId];
  return loadResultsAdaptive().per_address.find(
    (row) => row.id === wantId || row.id?.startsWith(fixtureId)
  );
}

export function p10ToCountOf10(rate: number): number {
  return Math.round(rate * 10);
}

export function formatAdaptiveP10Count(rate: number): string {
  return `${p10ToCountOf10(rate)} of 10`;
}
