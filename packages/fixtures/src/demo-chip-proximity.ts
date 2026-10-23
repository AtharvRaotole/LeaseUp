import { boulderFixture } from './boulder.js';
import { seviervilleFixture } from './sevierville.js';
import { wickerparkFixture } from './wicker-park.js';
import { haversineDistance } from './store-geo.js';
import type { DemoFixtureId } from './demo-addresses.js';

export type DemoChipDisplay = {
  id: DemoFixtureId;
  neighborhood: string;
  city: string;
  latitude: number;
  longitude: number;
};

/** Demo chip pins and headline labels (may differ from fixture location.name). */
export const DEMO_CHIP_DISPLAYS: DemoChipDisplay[] = [
  {
    id: 'wicker',
    neighborhood: 'Wicker Park',
    city: 'Chicago',
    latitude: wickerparkFixture.location.latitude,
    longitude: wickerparkFixture.location.longitude,
  },
  {
    id: 'boulder',
    neighborhood: 'Pearl Street',
    city: 'Boulder',
    latitude: boulderFixture.location.latitude,
    longitude: boulderFixture.location.longitude,
  },
  {
    id: 'sevierville',
    neighborhood: 'Sevierville',
    city: 'Tennessee',
    latitude: seviervilleFixture.location.latitude,
    longitude: seviervilleFixture.location.longitude,
  },
];

export function matchDemoChipWithinMeters(
  latitude: number,
  longitude: number,
  maxMeters = 300
): DemoChipDisplay | null {
  for (const chip of DEMO_CHIP_DISPLAYS) {
    const km = haversineDistance(latitude, longitude, chip.latitude, chip.longitude);
    if (km * 1000 <= maxMeters) return chip;
  }
  return null;
}
