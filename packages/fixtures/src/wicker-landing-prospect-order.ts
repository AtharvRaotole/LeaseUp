import order from './wicker-landing-prospect-order.json';

export type WickerLandingProspectRow = {
  entityId: string;
  name: string;
};

/** Top demo analyze prospects for Wicker (storefront 2500 sq ft, 10 km), same order as live report. */
export const WICKER_LANDING_PROSPECT_TOP: WickerLandingProspectRow[] = order.top;

export function wickerLandingProspectTopNames(limit = 10): string[] {
  return WICKER_LANDING_PROSPECT_TOP.slice(0, limit).map((row) => row.name);
}

export function wickerLandingProspectTopEntityIds(limit = 10): string[] {
  return WICKER_LANDING_PROSPECT_TOP.slice(0, limit).map((row) => row.entityId);
}
