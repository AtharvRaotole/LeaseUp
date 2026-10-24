import order from './wicker-landing-pitch-order.json';

export type WickerLandingPitchRow = {
  entityId: string;
  name: string;
};

/** Top pitched brands for Wicker demo analyze (storefront 2500 sq ft, 10 km). */
export const WICKER_LANDING_PITCH_TOP: WickerLandingPitchRow[] = order.top;

export function wickerLandingPitchTopNames(limit = 10): string[] {
  return WICKER_LANDING_PITCH_TOP.slice(0, limit).map((row) => row.name);
}

export function wickerLandingPitchTopEntityIds(limit = 10): string[] {
  return WICKER_LANDING_PITCH_TOP.slice(0, limit).map((row) => row.entityId);
}
