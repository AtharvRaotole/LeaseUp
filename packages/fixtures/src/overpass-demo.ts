import type { OverpassBrand } from './overpass-types';

/** Shown on demo prospects when no recorded Overpass file exists for the chip. */
export const DEMO_OSM_UNRECORDED_NOTE = 'OSM check not recorded for demo';

export interface OverpassDemoRecording {
  recordedAt: string;
  endpoint: string;
  query: string;
  brands: OverpassBrand[];
}

export const overpassDemoByFixture: Record<
  'wicker' | 'boulder' | 'sevierville',
  OverpassDemoRecording | null
> = {
  "wicker": null,
  "boulder": null,
  "sevierville": null
};
