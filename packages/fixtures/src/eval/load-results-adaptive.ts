import resultsAdaptive from './results_adaptive.json';
import {
  normalizeAddress,
  matchDemoFixtureId,
  type DemoFixtureId,
} from '../demo-addresses.js';
import type { AdaptiveEvalAddressRow, ResultsAdaptive } from './results-adaptive-types.js';

const BUNDLE = resultsAdaptive as unknown as ResultsAdaptive;

const DEMO_EVAL_ID: Record<DemoFixtureId, string> = {
  wicker: 'chi_wicker',
  boulder: 'boulder_co',
  sevierville: 'sevierville_tn',
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
  const evalId = DEMO_EVAL_ID[fixtureId];
  return loadResultsAdaptive().per_address.find(
    (row) =>
      row.eval_id === evalId ||
      row.id === fixtureId ||
      row.id?.replace(/-park$/, '') === fixtureId
  );
}

export function findAdaptiveEvalRowForDemo(fixtureId: DemoFixtureId): AdaptiveEvalAddressRow | undefined {
  const evalId = DEMO_EVAL_ID[fixtureId];
  return loadResultsAdaptive().per_address.find(
    (row) => row.eval_id === evalId || row.id === fixtureId || row.id?.includes(fixtureId)
  );
}

export function p10ToCountOf10(rate: number): number {
  return Math.round(rate * 10);
}

export function formatAdaptiveP10Count(rate: number): string {
  return `${p10ToCountOf10(rate)} of 10`;
}
