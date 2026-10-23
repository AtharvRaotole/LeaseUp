import type { OverpassBrand } from './overpass-types';

/** Recorded OSM absence checks for demo chips (instant 2-source verification). */
export const overpassDemoByFixture: Record<
  'wicker' | 'boulder' | 'sevierville',
  { brands: OverpassBrand[] }
> = {
  wicker: { brands: [] },
  boulder: { brands: [] },
  sevierville: { brands: [] },
};
