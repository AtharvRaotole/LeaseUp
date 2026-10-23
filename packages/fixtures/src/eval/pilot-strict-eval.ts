import type { DemoFixtureId } from '../demo-addresses.js';
import { buildEvalSiteSnapshot, type EvalSiteSnapshot } from './build-snapshot.js';
import type { EvalRunBundle } from './types.js';
import strictResults from './strict-results.json';

const PILOT_ROW_ID: Record<DemoFixtureId, string> = {
  wicker: 'wicker-park',
  boulder: 'boulder',
  sevierville: 'sevierville',
};

/** Fixture-backed strict eval for demo chips when analyze JSON omits strictEval. */
export function getPilotStrictEvalSnapshot(fixtureId: DemoFixtureId): EvalSiteSnapshot | null {
  const bundle = strictResults as EvalRunBundle;
  const row = bundle.rows.find((r) => r.id === PILOT_ROW_ID[fixtureId]);
  if (!row?.siteMetrics) return null;
  return buildEvalSiteSnapshot(row.siteMetrics);
}
