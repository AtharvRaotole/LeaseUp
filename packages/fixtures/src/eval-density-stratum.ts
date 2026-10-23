import type { DemoFixtureId } from './demo-addresses.js';

/** Preregistered density strata for adaptive presence radius (see results_adaptive.json by_stratum). */
export type EvalDensityStratum =
  | 'dense_urban'
  | 'urban'
  | 'suburban'
  | 'exurban'
  | 'tourist';

const RADIUS_KM_BY_STRATUM: Record<EvalDensityStratum, number> = {
  dense_urban: 1.5,
  urban: 2.5,
  suburban: 5,
  exurban: 7,
  tourist: 4,
};

export function adaptiveRadiusKmForStratum(
  stratum: EvalDensityStratum,
  searchRadiusKm: number
): number {
  return Math.min(searchRadiusKm, RADIUS_KM_BY_STRATUM[stratum] ?? 5);
}

/** Demo chips mapped to live-eval strata (Wicker = dense_urban per preregistration). */
export function demoFixtureStratum(fixtureId: DemoFixtureId): EvalDensityStratum {
  if (fixtureId === 'wicker' || fixtureId === 'boulder') return 'dense_urban';
  if (fixtureId === 'sevierville') return 'tourist';
  return 'urban';
}

/** Legacy EvalSiteDensity to default stratum when live bundle has no row. */
export function densityToDefaultStratum(density: 'urban' | 'suburban' | 'exurban' | 'tourist'): EvalDensityStratum {
  if (density === 'urban') return 'dense_urban';
  if (density === 'suburban') return 'suburban';
  if (density === 'exurban') return 'exurban';
  return 'tourist';
}
